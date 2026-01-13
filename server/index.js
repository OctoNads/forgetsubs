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
const VERSION = '2.1.0-subscription-tracking'; // Version stamp to verify deployment

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
    bodyParserEnabled: true,
    subscriptionTracking: true,
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

    // Call Gemini AI with COMPREHENSIVE prompt for international statements
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{
              text: `You are an EXPERT financial analyst specialized in detecting ALL recurring subscription charges from bank and credit card statements worldwide.

🎯 CRITICAL MISSION: Find EVERY recurring subscription - don't miss any!

═══════════════════════════════════════════════════════════════

📋 ANALYSIS REQUIREMENTS:

1. Scan EVERY SINGLE TRANSACTION thoroughly
2. Look for charges that appear 2+ times (even if only seen twice in this statement)
3. Check for similar amounts to the same merchant across different dates
4. Consider BOTH exact matches AND similar amounts (±10% variance)
5. Look at transaction descriptions, merchant names, and payment patterns
6. Detect subscriptions in ANY currency (USD, EUR, GBP, INR, etc.)

═══════════════════════════════════════════════════════════════

✅ WHAT DEFINITELY COUNTS AS A SUBSCRIPTION:

🎬 STREAMING & ENTERTAINMENT:
- Netflix, Prime Video, Disney+, Hulu, HBO Max, Apple TV+, Paramount+
- YouTube Premium, YouTube Music, Crunchyroll, Viki, Hotstar
- Spotify, Apple Music, Amazon Music, Tidal, Deezer, SoundCloud Go

💻 SOFTWARE & PRODUCTIVITY:
- Microsoft 365, Adobe Creative Cloud, Canva Pro, Notion, Evernote
- Grammarly, ChatGPT Plus, GitHub Copilot, Copilot Pro
- Dropbox, Google One, iCloud+, OneDrive, pCloud

📱 APPS & SERVICES:
- Apple Services (Apple Music, iCloud, Apple TV+, App Store subscriptions)
- Google Play subscriptions, Google Workspace
- Patreon, Substack, Medium membership
- Dating apps: Tinder Plus/Gold, Bumble Premium, Hinge Preferred

🎮 GAMING:
- Xbox Game Pass, PlayStation Plus, Nintendo Switch Online
- Steam, Epic Games, EA Play, Ubisoft+
- Discord Nitro, Twitch Turbo

🏋️ FITNESS & HEALTH:
- Peloton, Apple Fitness+, Strava, MyFitnessPal Premium
- Calm, Headspace, BetterHelp, Noom

🔒 SECURITY & VPN:
- NordVPN, ExpressVPN, Surfshark, Private Internet Access
- McAfee, Norton, Kaspersky, Bitdefender
- 1Password, LastPass, Dashlane

📰 NEWS & MEDIA:
- New York Times, Wall Street Journal, The Athletic
- Kindle Unlimited, Audible, Scribd

🛍️ SHOPPING & DELIVERY:
- Amazon Prime, Walmart+, Target Circle 360
- DoorDash DashPass, Uber One, Grubhub+
- Instacart+, Shipt

💼 PROFESSIONAL:
- LinkedIn Premium, Zoom Pro, Slack
- QuickBooks, FreshBooks, Wave
- Coursera, Udemy, MasterClass, Duolingo Plus

🌐 TELECOM & INTERNET (if clearly subscription-based):
- Jio subscriptions (MyJio plans)
- Airtel digital services (not regular phone bills)
- Internet service providers (if monthly recurring)

📱 FINANCIAL APPS:
- SuperMoney, MoneyView, Cred premium features
- Investment app subscriptions
- Credit monitoring services

🎵 REGIONAL SERVICES (India, Asia, Global):
- Gaana Plus, JioSaavn Pro, Wynk Music
- Zee5, SonyLiv, Aha, MX Player
- Voot, ALTBalaji, Eros Now

═══════════════════════════════════════════════════════════════

❌ DO NOT INCLUDE:

- ONE-TIME purchases (even from subscription companies)
- Utility bills (electricity, water, gas) - UNLESS clearly a subscription service
- Standard phone/mobile bills
- Rent/mortgage payments
- Insurance premiums
- Bank maintenance charges (AMB charges, service fees)
- ATM fees
- Account transfers
- Refunds or credits
- Government payments
- Tax payments

═══════════════════════════════════════════════════════════════

🔍 DETECTION STRATEGIES:

1. **EXACT RECURRING**: Same merchant, same/similar amount, 2+ times
   Example: "APPLE.COM/BILL ₹889" appears in July, September, November = Apple Services subscription

2. **PATTERN MATCHING**: Look for these keywords in transaction descriptions:
   - "SUBSCRIPTION", "RECURRING", "MEMBERSHIP", "PREMIUM", "PRO", "PLUS"
   - "MONTHLY", "ANNUAL", "AUTO-RENEW", "AUTO-PAY"
   - App store subscriptions: "GOOGLE*PLAY", "APPLE.COM/BILL", "APP STORE"

3. **MERCHANT NORMALIZATION**: Clean up transaction descriptions:
   - "APPLE MEDIA SERVICES-APPLESERVICES.BDSI@HDFCBANK" → "Apple Services"
   - "UPI-SUPER MONEY-EUROSUPER@ICICI" → "SuperMoney"
   - "MYJIO-MYJIO.EASEBUZZ@HDFCBANK" → "MyJio"
   - "GOOGLE PLAY-PLAYSTORE@AXISBANK" → "Google Play"
   - "POS 419188XXXXXX0507 GOOGLE *PLAY" → "Google Play"
   - "AIR FIBER PAYMENT 5G-PAYTM" → "Airtel Air Fiber"
   - "FASHNEAR TECHNOLOGIE-MEESHO.PAYTM" → "Meesho" (if recurring)

4. **AMOUNT GROUPING**: If a merchant appears multiple times with amounts within ±10%:
   - Example: ₹889, ₹890, ₹888 from "Apple Services" = recurring subscription
   - Calculate average as monthlyAmount

5. **INTERNATIONAL CURRENCY SUPPORT**:
   - Detect currency from statement: INR (₹), USD ($), EUR (€), GBP (£), etc.
   - Return proper currencyCode and currencySymbol
   - Format amounts according to currency

═══════════════════════════════════════════════════════════════

💰 CALCULATION REQUIREMENTS:

For EACH subscription found:

- **monthlyAmount**: Average charge per occurrence (if varies, calculate mean)
- **totalPaid**: SUM of all charges for this subscription in the statement period
- **paidMonths**: COUNT of how many times charged in statement
- **annualCost**: monthlyAmount × 12 (projected annual cost)
- **lastDate**: Most recent charge date in YYYY-MM-DD format
- **cancelUrl**: Official cancellation page URL (use your knowledge of services)

IMPORTANT: 
- If seen 3 times in 6 months → it's still monthly, annualCost = monthlyAmount × 12
- totalAnnualWaste = SUM of all annualCost values

═══════════════════════════════════════════════════════════════

🔗 CANCELLATION URLS (Use these or find official ones):

Streaming:
- Netflix: "https://www.netflix.com/cancelplan"
- Spotify: "https://www.spotify.com/account/subscription/"
- Disney+: "https://www.disneyplus.com/account"
- Prime Video: "https://www.amazon.com/mc/manageprime"
- Apple TV+: "https://support.apple.com/en-us/HT202039"
- YouTube Premium: "https://myaccount.google.com/subscriptions"

Software:
- Adobe: "https://account.adobe.com/plans"
- Microsoft 365: "https://account.microsoft.com/services"
- Canva: "https://www.canva.com/settings/subscriptions"
- Notion: "https://www.notion.so/my-account/settings"

Apps & Services:
- Apple Services: "https://support.apple.com/en-us/HT202039"
- Google Play: "https://play.google.com/store/account/subscriptions"
- Patreon: "https://www.patreon.com/settings/subscriptions"

Indian Services:
- Jio: "https://www.jio.com/selfcare/plans/"
- Airtel: "https://www.airtel.in/myaccount/"
- SuperMoney: "https://www.supermoney.co.in/"

If unsure, return: null (don't guess)

═══════════════════════════════════════════════════════════════

📤 OUTPUT FORMAT (ONLY VALID JSON, NO MARKDOWN):

If NOT a valid bank/credit card statement:
{"error": "Not a valid bank statement: [reason]"}

If valid statement with subscriptions:
{
  "isBankStatement": true,
  "currencyCode": "INR",
  "currencySymbol": "₹",
  "subscriptions": [
    {
      "name": "Apple Services",
      "monthlyAmount": 8.00,
      "totalPaid": 24.00,
      "paidMonths": 3,
      "annualCost": 96.00,
      "lastDate": "2025-11-20",
      "cancelUrl": "https://support.apple.com/en-us/HT202039"
    },
    {
      "name": "MyJio",
      "monthlyAmount": 349.00,
      "totalPaid": 349.00,
      "paidMonths": 1,
      "annualCost": 4188.00,
      "lastDate": "2025-12-02",
      "cancelUrl": "https://www.jio.com/selfcare/plans/"
    }
  ],
  "totalAnnualWaste": 14856.00
}

If valid statement but NO subscriptions found:
{
  "isBankStatement": true,
  "currencyCode": "INR",
  "currencySymbol": "₹",
  "subscriptions": [],
  "totalAnnualWaste": 0
}

═══════════════════════════════════════════════════════════════

🚨 CRITICAL REMINDERS:

1. Output ONLY valid JSON - no markdown, no explanations, no backticks
2. Scan EVERY transaction carefully - don't miss any
3. Look for patterns even if merchant name varies slightly
4. Be thorough - users are counting on you to find ALL their subscriptions
5. Small charges matter too (₹2, ₹15, etc.) if they recur
6. Check the ENTIRE statement period (usually 3-6 months)
7. Don't include bank fees/charges as subscriptions
8. Calculate annualCost properly: monthlyAmount × 12

═══════════════════════════════════════════════════════════════

Now analyze this bank statement and find ALL recurring subscriptions:

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

    // Call Gemini AI with COMPREHENSIVE prompt for international statements
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{
              text: `You are an EXPERT financial analyst specialized in detecting ALL recurring subscription charges from bank and credit card statements worldwide.

🎯 CRITICAL MISSION: Find EVERY recurring subscription - don't miss any!

[Using same comprehensive prompt as /api/analyze-text endpoint - scanning for Apple Services, MyJio, SuperMoney, Google Play, Airtel, and ALL other recurring subscriptions]

Now analyze this bank statement and find ALL recurring subscriptions:

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
    const { reportId, method, chainId, txHash, signature, address, walletAddress, existingSubscriber } = req.body;
    
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
      // NEW: Check if this is an existing subscriber just verifying ownership
      if (existingSubscriber && walletAddress) {
        // Verify wallet owns the subscription in Supabase
        const { data: subscription, error } = await supabase
          .from('paid_subscriptions')
          .select('wallet_address')
          .eq('wallet_address', walletAddress.toLowerCase())
          .single();

        if (subscription && !error) {
          console.log('✅ Existing subscriber verified:', walletAddress);
          isVerified = true;
        } else {
          return res.status(400).json({ error: "Subscription not found for this wallet" });
        }
      } else {
        // New payment - verify transaction on blockchain
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
          // Note: Subscription saving is handled by client-side Supabase call
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


// ==================== API: CHECK SUBSCRIPTION STATUS ====================
app.post('/api/check-subscription', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress || !isValidEthereumAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const { data, error } = await supabase
      .from('paid_subscriptions')
      .select('wallet_address, created_at, last_verified_at')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (data && !error) {
      return res.json({ 
        hasSubscription: true,
        createdAt: data.created_at,
        lastVerified: data.last_verified_at
      });
    } else {
      return res.json({ hasSubscription: false });
    }
  } catch (err) {
    console.error('❌ Subscription check error:', err);
    res.status(500).json({ error: 'Server error' });
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