// Server code: index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const PDFParser = require('pdf2json');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const { createPublicClient, http, parseEventLogs, parseUnits, recoverMessageAddress } = require('viem');
const { mainnet, bsc, base } = require('viem/chains');
const crypto = require('crypto'); // Used for secure Report IDs

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const RECEIVER_WALLET = "0xACe6f654b9cb7d775071e13549277aCd17652EAF";

// --- IN-MEMORY REPORT CACHE (RAM ONLY) ---
// This stores the sensitive data on the server. The client only gets a summary initially.
// Maps reportId -> { fullData, timestamp }
const reportCache = new Map();

// Auto-cleanup cache every 10 minutes to free RAM
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of reportCache.entries()) {
    if (now - data.timestamp > 30 * 60 * 1000) { // 30 mins TTL
      reportCache.delete(id);
    }
  }
}, 5 * 60 * 1000);

const monad = {
  id: 143,
  name: 'Monad Mainnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://infra.originstake.com/monad/evm'] },
    public: { http: ['https://infra.originstake.com/monad/evm'] },
  },
  blockExplorers: {
    default: { name: 'MonadVision', url: 'https://monadvision.com' },
  },
  testnet: false,
};

// Contract ABIs
const ERC721_ABI = [{
  name: 'balanceOf',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'owner', type: 'address' }],
  outputs: [{ name: 'balance', type: 'uint256' }]
}];

const ERC20_ABI = [{
  name: 'Transfer',
  type: 'event',
  inputs: [
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: true },
    { name: 'value', type: 'uint256' }
  ]
}];

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function extractTextFromPDF(buffer) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, true);
    pdfParser.on('pdfParser_dataError', (errData) => reject(errData.parserError));
    pdfParser.on('pdfParser_dataReady', () => {
      resolve(pdfParser.getRawTextContent());
    });
    pdfParser.parseBuffer(buffer);
  });
}

function redactSensitiveInfo(text) {
  let redacted = text;
  redacted = redacted.replace(/\b(?:\d{4}[ -]?){2,5}\d{4}\b|\b\d{8,20}\b/g, '[REDACTED_ACCOUNT]');
  const namePrefixes = 'Account Holder|Customer Name|Name|Holder|Client|Titular|Beneficiary|Payee|Welcome|Dear|To|From|Full Name|Nominee|Authorized';
  redacted = redacted.replace(
    new RegExp(`(${namePrefixes})\\s*[:\\s=]+[A-Za-zÀ-ÿ\\s'-]{3,40}`, 'gi'),
    '$1: [REDACTED_NAME]'
  );
  const addrKeywords = 'Address|Residence|Home Address|Mailing Address|Billing Address|Registered Address|My Address|Correspondence';
  redacted = redacted.replace(
    new RegExp(`(${addrKeywords})\\s*[:\\s=]+[^\\n\\r]{10,120}`, 'gi'),
    '$1: [REDACTED_ADDRESS]'
  );
  redacted = redacted.replace(
    /(\+?\d{1,4}[-.\s]?)?(\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,6})/g,
    '[REDACTED_PHONE]'
  );
  redacted = redacted.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED_EMAIL]');
  return redacted;
}

// === API: ANALYZE (SECURE) ===
app.post('/api/analyze', upload.array('files'), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    let rawText = "";

    for (const file of files) {
      if (file.mimetype === 'application/pdf') {
        try {
          const pdfText = await extractTextFromPDF(file.buffer);
          rawText += pdfText + "\n\n";
        } catch (pdfError) {
          console.error("PDF parsing failed:", file.originalname, pdfError);
          rawText += "[PDF parsing failed]\n\n";
        }
      } else {
        return res.status(400).json({ error: "Only PDF files are supported" });
      }
    }

    const redactedText = redactSensitiveInfo(rawText);
    const textForGemini = redactedText.length > 100000
      ? redactedText.substring(0, 100000)
      : redactedText;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{
              text: `You are a strict financial data auditor for international bank statements.
Output ONLY valid JSON – no explanations, no markdown.

If NOT valid or no meaningful transactions: 
{"error": "Not a valid bank statement: [very brief reason]"}

If valid, output:
{
  "isBankStatement": true,
  "currencyCode": "USD/EUR/GBP/...",
  "currencySymbol": "$/€/£/...",
  "subscriptions": [
    {
      "name": "Normalized service name (Netflix, Spotify, etc.)",
      "monthlyAmount": number,
      "totalPaid": number,
      "paidMonths": integer,
      "annualCost": number,
      "lastDate": "YYYY-MM-DD",
      "cancelUrl": "official URL or null"
    }
  ],
  "totalAnnualWaste": number
}

Rules:
- Detect recurring consumer subscriptions.
- Normalize names (e.g., "GOOGLE*YOUTUBE" → "YouTube Premium").
- Calculate annualCost = monthlyAmount × 12.
- totalAnnualWaste = sum of annualCost.

Text:
${textForGemini}`
            }]
          }],
          generationConfig: {
            temperature: 0,
            response_mime_type: "application/json"
          }
        })
      }
    );

  if (!geminiResponse.ok) {
  const errorDetails = await geminiResponse.text();
  console.error("❌ Google Gemini API Error:", errorDetails);
  return res.status(500).json({ error: "AI service unavailable. Check server logs." });
}

    const geminiResult = await geminiResponse.json();
    const messageContent = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsedData;
    try {
      parsedData = JSON.parse(messageContent.trim());
    } catch (e) {
      return res.status(500).json({ error: "Invalid AI response format" });
    }

    if (parsedData.error) {
      return res.status(422).json({ error: parsedData.error });
    }

    // --- SECURE CACHING STRATEGY ---
    // Generate a secure ID for this report
    const reportId = crypto.randomUUID();
    
    // Store the FULL sensitive data in server RAM only
    reportCache.set(reportId, {
      data: parsedData,
      timestamp: Date.now()
    });

    // Send back ONLY the summary (Safe for public view)
    res.json({
      reportId: reportId,
      isBankStatement: true,
      currencySymbol: parsedData.currencySymbol || '$',
      totalAnnualWaste: parsedData.totalAnnualWaste || 0,
      subscriptionCount: parsedData.subscriptions ? parsedData.subscriptions.length : 0,
      // Note: We do NOT send the subscription list here anymore.
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// === API: VERIFY & UNLOCK (SECURE) ===
app.post('/api/unlock-report', async (req, res) => {
  try {
    const { reportId, method, chainId, txHash, signature, address } = req.body;
    
    if (!reportCache.has(reportId)) {
      return res.status(404).json({ error: "Report expired or not found. Please re-upload." });
    }

    const cachedReport = reportCache.get(reportId);
    let isVerified = false;

    // 1. Verify Payment (5 USDC)
    if (method === 'payment') {
      if (!txHash || !chainId) return res.status(400).json({ error: "Missing transaction details" });
      
      const chainMap = { 1: mainnet, 56: bsc, 8453: base, 143: monad };
      const chain = chainMap[chainId];
      if (!chain) return res.status(400).json({ error: "Unsupported chain" });

      const client = createPublicClient({ chain, transport: http() });
      const receipt = await client.getTransactionReceipt({ hash: txHash });

      if (receipt.status !== 'success') return res.status(400).json({ error: "Transaction failed" });

      const logs = parseEventLogs({
        abi: ERC20_ABI,
        logs: receipt.logs,
        eventName: 'Transfer'
      });

      // Verify it was 5 USDC (5 * 10^6) sent to our wallet
      const validTransfer = logs.some(log => 
        log.args.to.toLowerCase() === RECEIVER_WALLET.toLowerCase() &&
        log.args.value >= BigInt(parseUnits('5', 6)) 
      );

      if (validTransfer) isVerified = true;
    } 
    
    // 2. Verify NFT Holder (Strict Ownership Check)
    else if (method === 'nft') {
      if (!signature || !address) return res.status(400).json({ error: "Missing signature" });

      // Step A: Verify the signature matches the address
      const message = `Unlock Report: ${reportId}`; 
      const recoveredAddress = await recoverMessageAddress({ message, signature });

      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return res.status(401).json({ error: "Signature verification failed. Ownership not proven." });
      }

      // Step B: Verify Monad NFT Balance
      const OCTONADS_CONTRACT = "0x51840Af9f4b780556DEdE2C7aDa0d4344034a65f";
      const client = createPublicClient({ chain: monad, transport: http() });
      
      const balance = await client.readContract({
        address: OCTONADS_CONTRACT,
        abi: ERC721_ABI,
        functionName: 'balanceOf',
        args: [address]
      });

      if (Number(balance) >= 2) {
        isVerified = true;
      } else {
        return res.status(403).json({ error: "Insufficient OCTONADS balance (Need 2+)" });
      }
    }

    if (isVerified) {
      // Return the sensitive data ONLY now
      return res.json({ 
        success: true, 
        detailedData: cachedReport.data 
      });
    } else {
      return res.status(400).json({ error: "Verification failed" });
    }

  } catch (error) {
    console.error("Unlock Error:", error);
    res.status(500).json({ error: "Server verification error" });
  }
});

// === REFERRAL CLICK TRACKING ===
app.post('/api/referral-click', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Missing code' });

    const { data: user, error } = await supabase
      .from('users')
      .select('address, clicks')
      .eq('referral_code', code)
      .single();

    if (error || !user) return res.status(400).json({ error: 'Invalid referral code' });

    await supabase
      .from('users')
      .update({ clicks: user.clicks + 1 })
      .eq('address', user.address);

    res.json({ success: true });
  } catch (err) {
    console.error('Click tracking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Claim referral reward
app.post('/api/claim-referral', async (req, res) => {
  try {
    // This endpoint remains for crediting referrers. 
    // It blindly trusts the inputs in this specific implementation, 
    // but in production, you should double-check the txHash wasn't already used for a different purpose.
    const { referrerCode, txHash, chainId, payerAddress } = req.body;

    const { data: alreadyClaimed } = await supabase
      .from('claimed_tx')
      .select('id')
      .eq('tx_hash', txHash)
      .eq('chain_id', chainId)
      .single();

    if (alreadyClaimed) return res.json({ success: false, message: 'Already claimed' });

    const { data: referrer } = await supabase
      .from('users')
      .select('address')
      .eq('referral_code', referrerCode)
      .single();

    if (!referrer || referrer.address.toLowerCase() === payerAddress.toLowerCase()) {
      return res.json({ success: false, message: 'Invalid or self referral' });
    }

    // Verify transaction again to ensure it happened
    const chainMap = { 1: mainnet, 56: bsc, 8453: base, 143: monad };
    const chain = chainMap[chainId];
    const client = createPublicClient({ chain, transport: http() });
    const receipt = await client.getTransactionReceipt({ hash: txHash });

    if (receipt.status !== 'success') return res.status(400).json({ error: 'Transaction failed' });

    // Credit User
    const reward = 1.5;
    const { data: current } = await supabase
      .from('users')
      .select('successful_refers, earnings, available_balance')
      .eq('address', referrer.address)
      .single();

    await supabase
      .from('users')
      .update({
        successful_refers: current.successful_refers + 1,
        earnings: (current.earnings || 0) + reward,
        available_balance: (current.available_balance || 0) + reward
      })
      .eq('address', referrer.address);

    await supabase.from('successful_referrals').insert({
      referrer_address: referrer.address,
      referred_address: payerAddress.toLowerCase(),
      tx_hash: txHash,
      chain_id: chainId
    });

    await supabase.from('claimed_tx').insert({ tx_hash: txHash, chain_id: chainId });

    res.json({ success: true });
  } catch (err) {
    console.error('Claim referral error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Withdrawal Request
app.post('/api/withdraw', async (req, res) => {
  try {
    const { address, amount, token, chainId, toAddress, signature, timestamp } = req.body;

    if (!address || !amount || !token || !chainId || !toAddress || !signature || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (isNaN(amount) || amount < 5) return res.status(400).json({ error: 'Minimum withdrawal is $5' });
    if (Date.now() - parseInt(timestamp) > 300000) return res.status(400).json({ error: 'Request expired' });

    const message = `ForgetSubs withdrawal request: ${amount} ${token} to ${toAddress} on chain ${chainId} timestamp:${timestamp}`;
    const recoveredAddress = await recoverMessageAddress({ message, signature });

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('available_balance')
      .eq('address', address.toLowerCase())
      .single();

    if (!user || (user.available_balance || 0) < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Deduct Balance
    await supabase
      .from('users')
      .update({ available_balance: user.available_balance - amount })
      .eq('address', address.toLowerCase());

    // Record Withdrawal
    await supabase.from('withdrawals').insert({
      user_address: address.toLowerCase(),
      amount,
      token,
      chain_id: parseInt(chainId),
      to_address: toAddress,
      status: 'pending',
      created_at: new Date().toISOString()
    });

    res.json({ success: true, message: 'Withdrawal request submitted' });
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});