// index.js - Improved Backend Server
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const PDFParser = require('pdf2json');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const { createPublicClient, http, parseEventLogs, parseUnits, recoverMessageAddress } = require('viem');
const { mainnet, bsc, base } = require('viem/chains');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const VERSION = '2.0.1-bodyparser-fix'; // Version stamp to verify deployment

// ==================== SECURITY MIDDLEWARE ====================
app.use(helmet()); // Security headers

// Parse JSON bodies FIRST (before any other middleware)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration for production and development
const allowedOrigins = [
  process.env.FRONTEND_URL,           // From environment variable
  'https://forgetsubs.com',            // Production domain
  'https://www.forgetsubs.com',        // WWW subdomain (if applicable)
  'http://localhost:5173',             // Local development
  'http://localhost:3000',             // Alternative local port
].filter(Boolean); // Remove any undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ CORS allowed:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS blocked:', origin);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle CORS preflight requests
app.options('*', cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Stricter rate limit for sensitive endpoints
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many attempts, please try again later.'
});

// ==================== FILE UPLOAD CONFIG ====================
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/csv', 'application/vnd.ms-excel'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Only PDF and CSV files are allowed'));
      return;
    }
    cb(null, true);
  }
});

// ==================== CONFIG ====================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const RECEIVER_WALLET = process.env.RECEIVER_WALLET || "0xACe6f654b9cb7d775071e13549277aCd17652EAF";

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set in environment variables');
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Supabase credentials are not set');
  process.exit(1);
}

// ==================== IN-MEMORY REPORT CACHE ====================
const reportCache = new Map();

// Auto-cleanup cache every 5 minutes
setInterval(() => {
  const now = Date.now();
  let deletedCount = 0;
  
  for (const [id, data] of reportCache.entries()) {
    if (now - data.timestamp > 30 * 60 * 1000) { // 30 mins TTL
      reportCache.delete(id);
      deletedCount++;
    }
  }
  
  if (deletedCount > 0) {
    console.log(`🧹 Cleaned up ${deletedCount} expired reports from cache`);
  }
}, 5 * 60 * 1000);

// ==================== BLOCKCHAIN CONFIG ====================
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

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY
);

// ==================== HELPER FUNCTIONS ====================
async function extractTextFromPDF(buffer) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, true);
    
    const timeout = setTimeout(() => {
      reject(new Error('PDF parsing timeout'));
    }, 30000); // 30 second timeout
    
    pdfParser.on('pdfParser_dataError', (errData) => {
      clearTimeout(timeout);
      reject(errData.parserError);
    });
    
    pdfParser.on('pdfParser_dataReady', () => {
      clearTimeout(timeout);
      resolve(pdfParser.getRawTextContent());
    });
    
    pdfParser.parseBuffer(buffer);
  });
}

function redactSensitiveInfo(text) {
  let redacted = text;
  
  // Redact account numbers
  redacted = redacted.replace(/\b(?:\d{4}[ -]?){2,5}\d{4}\b|\b\d{8,20}\b/g, '[REDACTED_ACCOUNT]');
  
  // Redact names
  const namePrefixes = 'Account Holder|Customer Name|Name|Holder|Client|Titular|Beneficiary|Payee|Welcome|Dear|To|From|Full Name|Nominee|Authorized';
  redacted = redacted.replace(
    new RegExp(`(${namePrefixes})\\s*[:\\s=]+[A-Za-zÀ-ÿ\\s'-]{3,40}`, 'gi'),
    '$1: [REDACTED_NAME]'
  );
  
  // Redact addresses
  const addrKeywords = 'Address|Residence|Home Address|Mailing Address|Billing Address|Registered Address|My Address|Correspondence';
  redacted = redacted.replace(
    new RegExp(`(${addrKeywords})\\s*[:\\s=]+[^\\n\\r]{10,120}`, 'gi'),
    '$1: [REDACTED_ADDRESS]'
  );
  
  // Redact phone numbers
  redacted = redacted.replace(
    /(\+?\d{1,4}[-.\s]?)?(\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,6})/g,
    '[REDACTED_PHONE]'
  );
  
  // Redact emails
  redacted = redacted.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, 
    '[REDACTED_EMAIL]'
  );
  
  return redacted;
}

function isValidEthereumAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// ==================== API: HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    version: VERSION,
    timestamp: new Date().toISOString(),
    cacheSize: reportCache.size,
    bodyParserEnabled: true
  });
});

// ==================== API: ANALYZE TEXT (HYBRID PRIVACY) ====================
// This endpoint receives ONLY pre-redacted text from the client
// The client extracts PDF and redacts PII before sending
app.post('/api/analyze-text', async (req, res) => {
  try {
    // DEBUGGING: Log request details
    console.log('🔍 Request Headers:', req.headers['content-type']);
    console.log('🔍 Body exists:', !!req.body);
    console.log('🔍 Body keys:', req.body ? Object.keys(req.body) : 'NO BODY');
    console.log('🔍 Raw body type:', typeof req.body);
    
    // Check if body was parsed
    if (!req.body) {
      console.error('❌ req.body is undefined - body parser not working!');
      return res.status(400).json({ 
        error: "Request body is missing. Please ensure Content-Type is application/json" 
      });
    }
    
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      console.log('❌ No text in body. Body content:', JSON.stringify(req.body).substring(0, 200));
      return res.status(400).json({ error: "No text provided" });
    }

    if (text.length < 100) {
      return res.status(400).json({ 
        error: "Text too short. Please ensure you're analyzing a valid statement." 
      });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    console.log(`📝 Analyzing ${text.length} characters of pre-redacted text (hybrid mode)`);

    // Additional server-side redaction as backup (belt and suspenders)
    const doubleRedacted = redactSensitiveInfo(text);

    // Call Gemini AI with improved prompt (using gemini-2.5-flash)
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{
              text: `You are an expert financial analyst specialized in detecting recurring subscription charges from bank and credit card statements.

CRITICAL INSTRUCTIONS:
1. Analyze the ENTIRE statement thoroughly - check ALL transactions across ALL pages
2. Look for RECURRING charges that appear multiple times (monthly, yearly, or at regular intervals)
3. A subscription is ANY recurring payment to the same merchant, regardless of category
4. Be VERY thorough - even small recurring charges ($1-5) are important subscriptions

WHAT COUNTS AS A SUBSCRIPTION:
✅ Streaming services (Netflix, Spotify, Disney+, Hulu, HBO Max, Apple TV+, YouTube Premium, etc.)
✅ Software/SaaS (Adobe, Microsoft 365, Canva, Dropbox, Google One, iCloud, ChatGPT Plus, etc.)
✅ Gaming (Xbox Game Pass, PlayStation Plus, Nintendo Switch Online, etc.)
✅ Fitness/Health (Peloton, Apple Fitness, Calm, Headspace, etc.)
✅ News/Media (NYT, Washington Post, Medium, Substack, Patreon, etc.)
✅ Music (Spotify, Apple Music, YouTube Music, Tidal, etc.)
✅ Cloud Storage (Dropbox, Google Drive, iCloud, OneDrive, etc.)
✅ VPN/Security (NordVPN, ExpressVPN, Norton, McAfee, etc.)
✅ Any other recurring digital service or membership

DO NOT INCLUDE:
❌ One-time purchases
❌ Utility bills (electricity, water, gas)
❌ Rent/mortgage payments
❌ Insurance
❌ Bank fees
❌ Transfers
❌ Refunds

NORMALIZATION RULES:
- "GOOGLE*YOUTUBE PREM" → "YouTube Premium"
- "SPOTIFY P03A29D84F" → "Spotify"
- "APPLE.COM/BILL" → "Apple Services"
- "AMZN PRIME" → "Amazon Prime"
- "NETFLIX.COM" → "Netflix"

OUTPUT FORMAT (ONLY VALID JSON):

If NOT a valid bank/credit card statement:
{"error": "Not a valid bank statement"}

If valid statement:
{
  "isBankStatement": true,
  "currencyCode": "USD",
  "currencySymbol": "$",
  "subscriptions": [
    {
      "name": "Netflix",
      "monthlyAmount": 15.49,
      "totalPaid": 30.98,
      "paidMonths": 2,
      "annualCost": 185.88,
      "lastDate": "2026-01-05",
      "cancelUrl": "https://www.netflix.com/cancelplan"
    }
  ],
  "totalAnnualWaste": 185.88
}

Bank Statement Text:
${doubleRedacted.substring(0, 200000)}`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            response_mime_type: "application/json"
          }
        }),
        timeout: 90000
      }
    );

    if (!geminiResponse.ok) {
      const errorDetails = await geminiResponse.text();
      console.error("❌ Gemini API Error:", errorDetails);
      return res.status(500).json({ 
        error: "AI service temporarily unavailable. Please try again." 
      });
    }

    const geminiResult = await geminiResponse.json();
    const messageContent = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsedData;
    try {
      parsedData = JSON.parse(messageContent.trim());
    } catch (e) {
      console.error("❌ Invalid AI response:", messageContent);
      return res.status(500).json({ 
        error: "Invalid AI response format. Please try again." 
      });
    }

    if (parsedData.error) {
      return res.status(422).json({ error: parsedData.error });
    }

    // Validate AI response structure
    if (!parsedData.subscriptions || !Array.isArray(parsedData.subscriptions)) {
      return res.status(500).json({ 
        error: "Invalid analysis result. Please try again." 
      });
    }

    if (parsedData.subscriptions.length === 0) {
      console.log(`⚠️  No subscriptions detected (${text.length} chars analyzed)`);
    }

    // Generate secure report ID
    const reportId = crypto.randomUUID();
    
    // Store full data in RAM cache
    reportCache.set(reportId, {
      data: parsedData,
      timestamp: Date.now()
    });

    console.log(`✅ Report ${reportId} created with ${parsedData.subscriptions.length} subscriptions (hybrid mode)`);

    // Text is automatically cleared from memory after this function completes
    // The redacted text is only in RAM briefly during analysis
    
    // Send only summary to client
    res.json({
      reportId: reportId,
      isBankStatement: true,
      currencySymbol: parsedData.currencySymbol || '$',
      totalAnnualWaste: parsedData.totalAnnualWaste || 0,
      subscriptionCount: parsedData.subscriptions.length,
    });

  } catch (error) {
    console.error("❌ Analysis error:", error);
    return res.status(500).json({ 
      error: "Internal server error. Please try again." 
    });
  }
});

// ==================== API: ANALYZE (ORIGINAL - KEPT FOR COMPATIBILITY) ====================
app.post('/api/analyze', upload.array('files', 5), async (req, res) => {
  try {
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    let rawText = "";

    // Process all uploaded files (PDF or CSV)
    for (const file of files) {
      if (file.mimetype === 'application/pdf') {
        try {
          const pdfText = await extractTextFromPDF(file.buffer);
          rawText += pdfText + "\n\n";
        } catch (pdfError) {
          console.error("PDF parsing failed:", file.originalname, pdfError);
          return res.status(400).json({ 
            error: `Failed to parse PDF: ${file.originalname}. Please ensure it's a valid PDF.` 
          });
        }
      } else if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
        try {
          const csvText = file.buffer.toString('utf-8');
          rawText += csvText + "\n\n";
        } catch (csvError) {
          console.error("CSV parsing failed:", file.originalname, csvError);
          return res.status(400).json({ 
            error: `Failed to parse CSV: ${file.originalname}. Please ensure it's a valid CSV file.` 
          });
        }
      } else {
        return res.status(400).json({ error: "Only PDF and CSV files are supported" });
      }
    }

    if (rawText.length < 100) {
      return res.status(400).json({ 
        error: "File appears to be empty or too short. Please upload a valid bank statement." 
      });
    }

    // Redact sensitive information
    const redactedText = redactSensitiveInfo(rawText);
    
    // Increase limit to 200k characters for better analysis (Gemini can handle it)
    const textForGemini = redactedText.length > 200000
      ? redactedText.substring(0, 200000)
      : redactedText;

    console.log(`📄 Processing ${files.length} file(s), ${textForGemini.length} chars sent to AI (original: ${rawText.length})`);

    // Call Gemini AI with improved prompt
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{
              text: `You are an expert financial analyst specialized in detecting recurring subscription charges from bank and credit card statements.

CRITICAL INSTRUCTIONS:
1. Analyze the ENTIRE statement thoroughly - check ALL transactions across ALL pages
2. Look for RECURRING charges that appear multiple times (monthly, yearly, or at regular intervals)
3. A subscription is ANY recurring payment to the same merchant, regardless of category
4. Be VERY thorough - even small recurring charges ($1-5) are important subscriptions

WHAT COUNTS AS A SUBSCRIPTION:
✅ Streaming services (Netflix, Spotify, Disney+, Hulu, HBO Max, Apple TV+, YouTube Premium, etc.)
✅ Software/SaaS (Adobe, Microsoft 365, Canva, Dropbox, Google One, iCloud, ChatGPT Plus, etc.)
✅ Gaming (Xbox Game Pass, PlayStation Plus, Nintendo Switch Online, Steam, Epic Games, etc.)
✅ Fitness/Health (Peloton, Apple Fitness, Calm, Headspace, MyFitnessPal Premium, etc.)
✅ News/Media (New York Times, Washington Post, Medium, Substack, Patreon, etc.)
✅ Music (Spotify, Apple Music, YouTube Music, Tidal, SoundCloud Go, etc.)
✅ Cloud Storage (Dropbox, Google Drive, iCloud, OneDrive, etc.)
✅ VPN/Security (NordVPN, ExpressVPN, Norton, McAfee, etc.)
✅ Productivity (Notion, Evernote, Todoist, Grammarly, etc.)
✅ Food Delivery (DoorDash DashPass, Uber Eats Pass, Grubhub+, etc.)
✅ Shopping (Amazon Prime, Walmart+, Target Circle, etc.)
✅ Professional (LinkedIn Premium, Zoom Pro, Slack, GitHub, etc.)
✅ Education (Coursera, Udemy, Duolingo Plus, MasterClass, etc.)
✅ Dating Apps (Tinder Plus/Gold, Bumble Boost, Hinge Preferred, etc.)
✅ Any other recurring digital service or membership

DO NOT INCLUDE:
❌ One-time purchases (even if from subscription companies)
❌ Utility bills (electricity, water, gas - unless explicitly labeled as a subscription service)
❌ Rent/mortgage payments
❌ Insurance (unless it's a subscription-based insurance app)
❌ Bank fees or interest charges
❌ Transfers to other accounts
❌ Refunds or credits

DETECTION STRATEGY:
1. Scan for merchant names that appear 2+ times with similar amounts
2. Look for keywords: "subscription", "membership", "premium", "plus", "pro", "monthly"
3. Check transaction descriptions for patterns like "RECURRING", "AUTO-PAY", "MONTHLY CHARGE"
4. Identify amounts that repeat exactly or within $1-2 variance
5. Common merchant prefixes to watch for: "GOOGLE*", "APPLE.COM/BILL", "AMZN", "PAYPAL*", "SQ*"

NORMALIZATION RULES:
- "GOOGLE*YOUTUBE PREM" → "YouTube Premium"
- "SPOTIFY P03A29D84F" → "Spotify"
- "APPLE.COM/BILL" → "Apple Services" (iCloud, Music, TV+, etc.)
- "AMZN PRIME" → "Amazon Prime"
- "NETFLIX.COM" → "Netflix"
- "SQ *CASH APP" → "Cash App" (if recurring)
- "PAYPAL *ADOBE" → "Adobe"
- Remove random alphanumeric codes, transaction IDs, and location codes
- Use the well-known brand name, not internal codes

CALCULATION REQUIREMENTS:
- monthlyAmount: The average charge per month (even if charged annually, divide by 12)
- totalPaid: Sum of ALL charges found for this subscription in the statement
- paidMonths: Count of how many times the charge appeared
- annualCost: monthlyAmount × 12 (NOT totalPaid)
- lastDate: Most recent transaction date for this subscription in YYYY-MM-DD format
- cancelUrl: Official cancellation page URL (use common knowledge, or null if unknown)

COMMON CANCELLATION URLS:
- Netflix: "https://www.netflix.com/cancelplan"
- Spotify: "https://www.spotify.com/account/subscription/"
- Disney+: "https://www.disneyplus.com/account"
- Amazon Prime: "https://www.amazon.com/mc/manageprime"
- Adobe: "https://account.adobe.com/plans"
- Apple Services: "https://support.apple.com/en-us/HT202039"
- Google/YouTube: "https://myaccount.google.com/subscriptions"

OUTPUT FORMAT (ONLY VALID JSON):

If NOT a valid bank/credit card statement:
{"error": "Not a valid bank statement: [specific reason - missing dates, no transactions, etc.]"}

If valid statement:
{
  "isBankStatement": true,
  "currencyCode": "USD",
  "currencySymbol": "$",
  "subscriptions": [
    {
      "name": "Netflix",
      "monthlyAmount": 15.49,
      "totalPaid": 30.98,
      "paidMonths": 2,
      "annualCost": 185.88,
      "lastDate": "2026-01-05",
      "cancelUrl": "https://www.netflix.com/cancelplan"
    }
  ],
  "totalAnnualWaste": 185.88
}

IMPORTANT:
- Output ONLY JSON, no markdown, no explanations, no code blocks
- Check EVERY page of the statement
- Even if you find 1 subscription, keep looking for more
- Small charges matter ($1-5 can add up)
- Be thorough - users are counting on you to find ALL their subscriptions

Bank Statement Text:
${textForGemini}`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            response_mime_type: "application/json"
          }
        }),
        timeout: 90000 // 90 second timeout for thorough analysis
      }
    );

    if (!geminiResponse.ok) {
      const errorDetails = await geminiResponse.text();
      console.error("❌ Gemini API Error:", errorDetails);
      return res.status(500).json({ 
        error: "AI service temporarily unavailable. Please try again." 
      });
    }

    const geminiResult = await geminiResponse.json();
    const messageContent = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsedData;
    try {
      parsedData = JSON.parse(messageContent.trim());
    } catch (e) {
      console.error("❌ Invalid AI response:", messageContent);
      return res.status(500).json({ 
        error: "Invalid AI response format. Please try again." 
      });
    }

    if (parsedData.error) {
      return res.status(422).json({ error: parsedData.error });
    }

    // Validate AI response structure
    if (!parsedData.subscriptions || !Array.isArray(parsedData.subscriptions)) {
      return res.status(500).json({ 
        error: "Invalid analysis result. Please try again." 
      });
    }

    // Log warning if no subscriptions found (might be legitimate, but worth noting)
    if (parsedData.subscriptions.length === 0) {
      console.log(`⚠️  No subscriptions detected in statement (${textForGemini.length} chars analyzed)`);
    }

    // Generate secure report ID
    const reportId = crypto.randomUUID();
    
    // Store full data in RAM cache
    reportCache.set(reportId, {
      data: parsedData,
      timestamp: Date.now()
    });

    console.log(`✅ Report ${reportId} created with ${parsedData.subscriptions.length} subscriptions`);

    // Send only summary to client
    res.json({
      reportId: reportId,
      isBankStatement: true,
      currencySymbol: parsedData.currencySymbol || '$',
      totalAnnualWaste: parsedData.totalAnnualWaste || 0,
      subscriptionCount: parsedData.subscriptions.length,
    });

  } catch (error) {
    console.error("❌ Analysis error:", error);
    return res.status(500).json({ 
      error: "Internal server error. Please try again." 
    });
  }
});

// ==================== API: UNLOCK REPORT ====================
app.post('/api/unlock-report', strictLimiter, async (req, res) => {
  try {
    const { reportId, method, chainId, txHash, signature, address } = req.body;
    
    // Validate inputs
    if (!reportId) {
      return res.status(400).json({ error: "Missing report ID" });
    }

    if (!reportCache.has(reportId)) {
      return res.status(404).json({ 
        error: "Report expired or not found. Please re-upload your statement." 
      });
    }

    const cachedReport = reportCache.get(reportId);
    let isVerified = false;

    // ==================== METHOD 1: PAYMENT ====================
    if (method === 'payment') {
      if (!txHash || !chainId) {
        return res.status(400).json({ error: "Missing transaction details" });
      }
      
      const chainMap = { 1: mainnet, 56: bsc, 8453: base, 143: monad };
      const chain = chainMap[chainId];
      
      if (!chain) {
        return res.status(400).json({ error: "Unsupported blockchain" });
      }

      try {
        const client = createPublicClient({ chain, transport: http() });
        const receipt = await client.getTransactionReceipt({ hash: txHash });

        if (receipt.status !== 'success') {
          return res.status(400).json({ error: "Transaction failed or pending" });
        }

        const logs = parseEventLogs({
          abi: ERC20_ABI,
          logs: receipt.logs,
          eventName: 'Transfer'
        });

        // Verify: 5 USDC sent to our wallet
        const validTransfer = logs.some(log => 
          log.args.to.toLowerCase() === RECEIVER_WALLET.toLowerCase() &&
          log.args.value >= BigInt(parseUnits('5', 6))
        );

        if (validTransfer) {
          isVerified = true;
          console.log(`✅ Payment verified: ${txHash}`);
        } else {
          return res.status(400).json({ 
            error: "Payment verification failed. Ensure you sent 5 USDC to the correct address." 
          });
        }
      } catch (blockchainError) {
        console.error("Blockchain verification error:", blockchainError);
        return res.status(500).json({ 
          error: "Failed to verify transaction. Please try again." 
        });
      }
    } 
    
    // ==================== METHOD 2: NFT HOLDER ====================
    else if (method === 'nft') {
      if (!signature || !address) {
        return res.status(400).json({ error: "Missing signature or address" });
      }

      if (!isValidEthereumAddress(address)) {
        return res.status(400).json({ error: "Invalid wallet address" });
      }

      try {
        // Verify signature
        const message = `Unlock Report: ${reportId}`; 
        const recoveredAddress = await recoverMessageAddress({ message, signature });

        if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
          return res.status(401).json({ 
            error: "Signature verification failed. Please try again." 
          });
        }

        // Verify NFT balance on Monad
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
          console.log(`✅ NFT holder verified: ${address} (${balance} NFTs)`);
        } else {
          return res.status(403).json({ 
            error: `Insufficient OCTONADS balance. You have ${balance}, need 2+.` 
          });
        }
      } catch (nftError) {
        console.error("NFT verification error:", nftError);
        return res.status(500).json({ 
          error: "Failed to verify NFT ownership. Please try again." 
        });
      }
    } else {
      return res.status(400).json({ error: "Invalid unlock method" });
    }

    // ==================== RETURN UNLOCKED DATA ====================
    if (isVerified) {
      return res.json({ 
        success: true, 
        detailedData: cachedReport.data 
      });
    } else {
      return res.status(400).json({ error: "Verification failed" });
    }

  } catch (error) {
    console.error("❌ Unlock error:", error);
    res.status(500).json({ error: "Server verification error" });
  }
});

// ==================== API: REFERRAL CLICK ====================
app.post('/api/referral-click', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Missing referral code' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('address, clicks')
      .eq('referral_code', code)
      .single();

    if (error || !user) {
      return res.status(400).json({ error: 'Invalid referral code' });
    }

    await supabase
      .from('users')
      .update({ clicks: user.clicks + 1 })
      .eq('address', user.address);

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Click tracking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== API: CLAIM REFERRAL ====================
app.post('/api/claim-referral', strictLimiter, async (req, res) => {
  try {
    const { referrerCode, txHash, chainId, payerAddress } = req.body;

    if (!referrerCode || !txHash || !chainId || !payerAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!isValidEthereumAddress(payerAddress)) {
      return res.status(400).json({ error: 'Invalid payer address' });
    }

    // Check if transaction already claimed
    const { data: alreadyClaimed } = await supabase
      .from('claimed_tx')
      .select('id')
      .eq('tx_hash', txHash)
      .eq('chain_id', chainId)
      .single();

    if (alreadyClaimed) {
      return res.json({ success: false, message: 'Reward already claimed' });
    }

    // Get referrer
    const { data: referrer } = await supabase
      .from('users')
      .select('address')
      .eq('referral_code', referrerCode)
      .single();

    if (!referrer) {
      return res.json({ success: false, message: 'Invalid referral code' });
    }

    // Prevent self-referral
    if (referrer.address.toLowerCase() === payerAddress.toLowerCase()) {
      return res.json({ success: false, message: 'Self-referral not allowed' });
    }

    // Verify transaction on blockchain
    const chainMap = { 1: mainnet, 56: bsc, 8453: base, 143: monad };
    const chain = chainMap[chainId];
    
    if (!chain) {
      return res.status(400).json({ error: 'Unsupported chain' });
    }

    const client = createPublicClient({ chain, transport: http() });
    const receipt = await client.getTransactionReceipt({ hash: txHash });

    if (receipt.status !== 'success') {
      return res.status(400).json({ error: 'Transaction not confirmed' });
    }

    // Credit referrer
    const REWARD = 1.5;
    const { data: current } = await supabase
      .from('users')
      .select('successful_refers, earnings, available_balance')
      .eq('address', referrer.address)
      .single();

    await supabase
      .from('users')
      .update({
        successful_refers: current.successful_refers + 1,
        earnings: (current.earnings || 0) + REWARD,
        available_balance: (current.available_balance || 0) + REWARD
      })
      .eq('address', referrer.address);

    // Record successful referral
    await supabase.from('successful_referrals').insert({
      referrer_address: referrer.address,
      referred_address: payerAddress.toLowerCase(),
      tx_hash: txHash,
      chain_id: chainId
    });

    // Mark transaction as claimed
    await supabase.from('claimed_tx').insert({ 
      tx_hash: txHash, 
      chain_id: chainId 
    });

    console.log(`✅ Referral claimed: ${referrer.address} earned $${REWARD}`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Claim referral error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== API: WITHDRAW ====================
app.post('/api/withdraw', strictLimiter, async (req, res) => {
  try {
    const { address, amount, token, chainId, toAddress, signature, timestamp } = req.body;

    // Validation
    if (!address || !amount || !token || !chainId || !toAddress || !signature || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!isValidEthereumAddress(address) || !isValidEthereumAddress(toAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 5) {
      return res.status(400).json({ error: 'Minimum withdrawal is $5' });
    }

    // Verify timestamp (prevent replay attacks)
    if (Date.now() - parseInt(timestamp) > 300000) { // 5 minutes
      return res.status(400).json({ error: 'Request expired. Please try again.' });
    }

    // Verify signature
    const message = `ForgetSubs withdrawal request: ${amount} ${token} to ${toAddress} on chain ${chainId} timestamp:${timestamp}`;
    const recoveredAddress = await recoverMessageAddress({ message, signature });

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check balance
    const { data: user } = await supabase
      .from('users')
      .select('available_balance')
      .eq('address', address.toLowerCase())
      .single();

    if (!user || (user.available_balance || 0) < numAmount) {
      return res.status(400).json({ 
        error: `Insufficient balance. Available: $${(user?.available_balance || 0).toFixed(2)}` 
      });
    }

    // Deduct balance
    await supabase
      .from('users')
      .update({ available_balance: user.available_balance - numAmount })
      .eq('address', address.toLowerCase());

    // Record withdrawal
    await supabase.from('withdrawals').insert({
      user_address: address.toLowerCase(),
      amount: numAmount,
      token,
      chain_id: parseInt(chainId),
      to_address: toAddress,
      status: 'pending',
      created_at: new Date().toISOString()
    });

    console.log(`✅ Withdrawal request: ${address} → ${numAmount} ${token}`);
    res.json({ success: true, message: 'Withdrawal request submitted successfully' });
  } catch (err) {
    console.error('❌ Withdrawal error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   🚀 FORGETSUBS API SERVER RUNNING           ║
║   📡 Port: ${PORT}                              ║
║   📦 Version: ${VERSION}                      ║
║   🔒 Security: Enabled                        ║
║   ⚡ Cache: ${reportCache.size} reports                      ║
╚═══════════════════════════════════════════════╝
  `);
  console.log('✅ Body parser: express.json() ENABLED');
  console.log('✅ CORS: Multi-origin support ENABLED');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});