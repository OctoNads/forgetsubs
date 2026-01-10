// Full Server-side index.js – FIXED for international banks + complete referral routes

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const PDFParser = require('pdf2json');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const { createPublicClient, http, parseEventLogs } = require('viem');
const { mainnet, bsc, base } = require('viem/chains');
const { parseUnits } = require('viem');

dotenv.config();

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Upload Setup (Store files in memory)
const upload = multer({ storage: multer.memoryStorage() });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const RECEIVER_WALLET = "0xACe6f654b9cb7d775071e13549277aCd17652EAF"; // from your frontend code

// Define Monad chain
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

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Helper: Extract Text from PDF Buffer
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

// IMPROVED: Safe, international redaction – preserve transactions at all costs
function redactSensitiveInfo(text) {
  let redacted = text;

  // 1. Account/IBAN numbers (8–20 digits, grouped or continuous)
  redacted = redacted.replace(/\b(?:\d{4}[ -]?){2,5}\d{4}\b|\b\d{8,20}\b/g, '[REDACTED_ACCOUNT]');

  // 2. Names after common banking prefixes (very targeted)
  const namePrefixes = 'Account Holder|Customer Name|Name|Holder|Client|Titular|Beneficiary|Payee|Welcome|Dear|To|From|Full Name|Nominee|Authorized';
  redacted = redacted.replace(
    new RegExp(`(${namePrefixes})\\s*[:\\s=]+[A-Za-zÀ-ÿ\\s'-]{3,40}`, 'gi'),
    '$1: [REDACTED_NAME]'
  );

  // 3. Addresses (after address-related keywords)
  const addrKeywords = 'Address|Residence|Home Address|Mailing Address|Billing Address|Registered Address|My Address|Correspondence';
  redacted = redacted.replace(
    new RegExp(`(${addrKeywords})\\s*[:\\s=]+[^\\n\\r]{10,120}`, 'gi'),
    '$1: [REDACTED_ADDRESS]'
  );

  // 4. Phones (international formats)
  redacted = redacted.replace(
    /(\+?\d{1,4}[-.\s]?)?(\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,6})/g,
    '[REDACTED_PHONE]'
  );

  // 5. Emails
  redacted = redacted.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED_EMAIL]');

  // 6. Credit/Debit Cards (13–19 digits)
  redacted = redacted.replace(/\b(?:\d{4}[ -]?){3,4}\d{3,4}\b/g, '[REDACTED_CARD]');

  // 7. Selective national IDs (avoid over-matching)
  redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]'); // US SSN
  redacted = redacted.replace(/[A-Z]{5}\d{4}[A-Z]/g, '[REDACTED_PAN]'); // Indian PAN
  // Do NOT redact generic numbers (transactions, dates, amounts, UPI IDs, etc.)

  return redacted;
}

// API Route: Analyze PDF
app.post('/api/analyze', upload.array('files'), async (req, res) => {
  console.log('Received upload request for /api/analyze');
  try {
    const files = req.files;
    console.log(`Number of files uploaded: ${files ? files.length : 0}`);

    if (!files || files.length === 0) {
      console.log('Error: No files uploaded');
      return res.status(400).json({ error: "No files uploaded" });
    }

    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set");
      return res.status(500).json({ error: "Server configuration error" });
    }

    let rawText = "";

    for (const file of files) {
      console.log(`Processing file: ${file.originalname}`);
      if (file.mimetype === 'application/pdf') {
        try {
          const pdfText = await extractTextFromPDF(file.buffer);
          console.log(`Extracted text from ${file.originalname}, length: ${pdfText.length}`);

          // Full raw log per file
          console.log(`=== RAW EXTRACTED TEXT FROM ${file.originalname} (FULL) ===`);
          console.log(pdfText);
          console.log(`=== END RAW TEXT FROM ${file.originalname} ===`);

          rawText += pdfText + "\n\n";
        } catch (pdfError) {
          console.error("PDF parsing failed:", file.originalname, pdfError);
          rawText += "[PDF parsing failed]\n\n";
        }
      } else {
        console.log(`Unsupported file type: ${file.originalname}`);
        return res.status(400).json({ error: "Only PDF files are supported" });
      }
    }

    console.log(`Raw text total length before redaction: ${rawText.length}`);

    const redactedText = redactSensitiveInfo(rawText);
    console.log(`Redacted text length: ${redactedText.length}`);

    // Safe Gemini input limit
    const textForGemini = redactedText.length > 100000
      ? redactedText.substring(0, 100000) + '\n... [truncated for safety/cost]'
      : redactedText;

    console.log(`Text length sent to Gemini: ${textForGemini.length}`);

    console.log('Sending request to Gemini API...');
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

First, detect if this is a valid bank/credit card statement (has bank name, dates, transaction table with descriptions/amounts, balances, etc.).

If NOT valid or no meaningful transactions: 
{"error": "Not a valid bank statement: [very brief reason]"}

If valid, output:
{
  "isBankStatement": true,
  "currencyCode": "USD/EUR/GBP/INR/AED/RUB/CNY/KRW/...",
  "currencySymbol": "$/€/£/₹/AED/R₽/¥/₩/...",
  "subscriptions": [
    {
      "name": "Normalized service name (Netflix, Spotify, YouTube Premium, Disney+, etc.)",
      "monthlyAmount": number,
      "totalPaid": number,
      "paidMonths": integer,
      "annualCost": number,
      "lastDate": "YYYY-MM-DD or date string",
      "cancelUrl": "official URL or null"
    }
  ],
  "totalAnnualWaste": number
}

Rules:
- Detect recurring consumer subscriptions (streaming, software, cloud, news, gym, etc.)
- Include if repeats (same/similar desc + amount) or single known subscription merchant
- Ignore one-offs, transfers, salary, utilities, rent, taxes, groceries, fuel
- Normalize names (e.g., "GOOGLE*YOUTUBE" → "YouTube Premium")
- Use common cancel URLs (Netflix, Spotify, Disney+, YouTube, Apple, Adobe, etc.)
- Calculate annualCost = monthlyAmount × 12 (or adjust if clearly different period)
- totalAnnualWaste = sum of annualCost

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
      const errorText = await geminiResponse.text();
      console.error("Gemini error:", geminiResponse.status, errorText);
      return res.status(500).json({ error: "AI service unavailable" });
    }

    const geminiResult = await geminiResponse.json();
    const messageContent = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsedData;
    try {
      parsedData = JSON.parse(messageContent.trim());
    } catch (e) {
      console.error("Gemini JSON parse failed:", messageContent);
      return res.status(500).json({ error: "Invalid AI response format" });
    }

    if (parsedData.error) {
      console.log('Gemini rejected:', parsedData.error);
      return res.status(422).json({ error: parsedData.error });
    }

    console.log('Valid analysis detected – returning to client');
    return res.json(parsedData);

  } catch (error) {
    console.error("Analysis error:", error);
    return res.status(500).json({ error: "Internal server error" });
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

// === CLAIM REFERRAL REWARD (after 5 USDC payment) ===
app.post('/api/claim-referral', async (req, res) => {
  try {
    const { referrerCode, txHash, chainId, payerAddress } = req.body;

    // Prevent replay attacks
    const { data: alreadyClaimed } = await supabase
      .from('claimed_tx')
      .select('id')
      .eq('tx_hash', txHash)
      .eq('chain_id', chainId)
      .single();

    if (alreadyClaimed) return res.json({ success: false, message: 'Already claimed' });

    // Find referrer
    const { data: referrer } = await supabase
      .from('users')
      .select('address')
      .eq('referral_code', referrerCode)
      .single();

    if (!referrer || referrer.address.toLowerCase() === payerAddress.toLowerCase()) {
      return res.json({ success: false, message: 'Invalid or self referral' });
    }

    // Verify transaction on-chain
    const chainMap = { 1: mainnet, 56: bsc, 8453: base, 143: monad };
    const chain = chainMap[chainId];
    if (!chain) return res.status(400).json({ error: 'Unsupported chain' });

    const client = createPublicClient({ chain, transport: http() });
    const receipt = await client.getTransactionReceipt({ hash: txHash });

    if (!receipt || receipt.status !== 'success') {
      return res.status(400).json({ error: 'Transaction failed or not found' });
    }

    const transferLogs = parseEventLogs({
      abi: [
        {
          name: 'Transfer',
          type: 'event',
          inputs: [
            { name: 'from', type: 'address', indexed: true },
            { name: 'to', type: 'address', indexed: true },
            { name: 'value', type: 'uint256' }
          ]
        }
      ],
      logs: receipt.logs,
      eventName: 'Transfer'
    });

    const validTransfer = transferLogs.some(log =>
      log.args.from?.toLowerCase() === payerAddress.toLowerCase() &&
      log.args.to?.toLowerCase() === RECEIVER_WALLET.toLowerCase() &&
      log.args.value === BigInt(parseUnits('5', 6))
    );

    if (!validTransfer) {
      return res.status(400).json({ error: 'Payment not verified' });
    }

    // Credit referrer: 1.5 USDC reward
    const reward = 1.5;
    const { data: current } = await supabase
      .from('users')
      .select('successful_refers, earnings')
      .eq('address', referrer.address)
      .single();

    await supabase
      .from('users')
      .update({
        successful_refers: current.successful_refers + 1,
        earnings: current.earnings + reward
      })
      .eq('address', referrer.address);

    // Record the referral
    await supabase
      .from('successful_referrals')
      .insert({
        referrer_address: referrer.address,
        referred_address: payerAddress.toLowerCase(),
        tx_hash: txHash,
        chain_id: chainId
      });

    // Mark tx as claimed
    await supabase
      .from('claimed_tx')
      .insert({ tx_hash: txHash, chain_id: chainId });

    res.json({ success: true });
  } catch (err) {
    console.error('Claim referral error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mock routes (optional)
app.post('/api/user', (req, res) => res.json({ success: true }));
app.post('/api/refer/conversion', (req, res) => res.json({ success: true }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});