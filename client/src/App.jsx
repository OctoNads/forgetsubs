// App.jsx - Hybrid Privacy Approach (Best of Both Worlds)
import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Lock, CheckCircle2, Coins, Gem,
  ArrowRight, Wallet, ExternalLink, AlertCircle, Users, ChevronDown,
  ShieldCheck, Zap, Trash2
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, usePublicClient, useSignMessage } from 'wagmi';
import { parseUnits, erc20Abi } from 'viem';
import { Routes, Route, useSearchParams, Link, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import * as pdfjsLib from 'pdfjs-dist';

import './App.css';
import ReferPage from './ReferPage';
import { PrivacyPage, TermsPage } from './LegalPages';
import ErrorBoundary from './ErrorBoundary';
import { supabase } from './supabase';

ChartJS.register(ArcElement, Tooltip, Legend);

// Configure PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// ==================== CONFIG ====================
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const RECEIVER_WALLET = import.meta.env.VITE_RECEIVER_WALLET || "0xACe6f654b9cb7d775071e13549277aCd17652EAF";

const USDC_ADDRESSES = {
  143: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
  56: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf'];

// ==================== CLIENT-SIDE PDF PROCESSING ====================
const extractTextFromPDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
};

// ==================== CLIENT-SIDE PII REDACTION ====================
const redactSensitiveInfo = (text) => {
  let redacted = text;
  
  // Redact account numbers (multiple patterns)
  redacted = redacted.replace(/\b(?:\d{4}[ -]?){2,5}\d{4}\b/g, '[ACCOUNT]');
  redacted = redacted.replace(/\b\d{8,20}\b/g, '[ACCOUNT]');
  
  // Redact names with common prefixes
  const namePrefixes = 'Account Holder|Customer Name|Name|Holder|Client|Dear|Welcome|To|From';
  redacted = redacted.replace(
    new RegExp(`(${namePrefixes})\\s*[:\\s=]+[A-Za-zÀ-ÿ\\s'-]{3,40}`, 'gi'),
    '$1: [REDACTED]'
  );
  
  // Redact addresses
  const addrKeywords = 'Address|Residence|Home Address|Mailing Address|Billing Address';
  redacted = redacted.replace(
    new RegExp(`(${addrKeywords})\\s*[:\\s=]+[^\\n\\r]{10,120}`, 'gi'),
    '$1: [REDACTED]'
  );
  
  // Redact phone numbers
  redacted = redacted.replace(
    /(\+?\d{1,4}[-.\s]?)?(\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,6})/g,
    '[PHONE]'
  );
  
  // Redact emails
  redacted = redacted.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    '[EMAIL]'
  );
  
  // Redact SSN/SIN patterns
  redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
  redacted = redacted.replace(/\b\d{9}\b/g, '[ID]');
  
  return redacted;
};

// ==================== SUBSCRIPTION ICONS ====================
const SUBSCRIPTION_ICONS = [
  { name: "Netflix", src: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" },
  { name: "Spotify", src: "https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg" },
  { name: "Disney+", src: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg" },
  { name: "Amazon Prime", src: "https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg" },
  { name: "Adobe", src: "https://www.clipartmax.com/png/middle/207-2078951_logo-adobe-creative-cloud-logo-png.png" },
  { name: "YouTube Premium", src: "https://upload.wikimedia.org/wikipedia/commons/d/dd/YouTube_Premium_logo.svg" },
  { name: "Apple TV+", src: "https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg" },
  { name: "Microsoft 365", src: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" },
];

// ==================== VERIFICATION MODAL ====================
const VerificationModal = ({ isOpen, status, error, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel center-text" style={{ maxWidth: '350px' }}>
        {status === 'processing' && (
          <>
            <div className="spinner-ring large"></div>
            <h3>Processing</h3>
            <p className="modal-desc">Please confirm action in your wallet...</p>
          </>
        )}
        {status === 'verifying' && (
          <>
            <div className="spinner-ring large pulse"></div>
            <h3>Verifying</h3>
            <p className="modal-desc">Checking proof on blockchain...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="success-icon-anim"><CheckCircle2 size={64} color="#00ffa3" /></div>
            <h3>Unlocked!</h3>
            <p className="modal-desc">Access granted successfully.</p>
          </>
        )}
        {status === 'denied' && (
          <>
            <div className="error-icon-anim"><AlertCircle size={64} color="#ff6b6b" /></div>
            <h3>Access Denied</h3>
            <p className="modal-desc">Transaction cancelled by user.</p>
            <button 
              className="modal-btn" 
              style={{ 
                marginTop: '1rem', 
                background: 'var(--card-bg)', 
                border: '1px solid white', 
                padding: '0.5rem 1rem', 
                borderRadius: '8px', 
                color: 'white', 
                cursor: 'pointer' 
              }} 
              onClick={onClose}
            >
              Close
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="error-icon-anim"><AlertCircle size={64} color="#ff6b6b" /></div>
            <h3>Failed</h3>
            <p className="modal-desc red">{error || "Something went wrong"}</p>
            <button 
              className="modal-btn" 
              style={{ 
                marginTop: '1rem', 
                background: 'var(--card-bg)', 
                border: '1px solid white', 
                padding: '0.5rem 1rem', 
                borderRadius: '8px', 
                color: 'white', 
                cursor: 'pointer' 
              }} 
              onClick={onClose}
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ==================== NAVBAR ====================
const Navbar = () => (
  <nav className="navbar-modern">
    <Link to="/" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
      <img 
        src="https://violet-obliged-whippet-350.mypinata.cloud/ipfs/bafybeihrzxwujwj4mzhztap2e7kd6hzt6agmdzme5cq572mg5iewv6qoly/forget_subs_logo-removebg-preview%20zoom.png" 
        alt="ForgetSubs Logo" 
        style={{ height: '40px', width: 'auto' }} 
      />
      <div>FORGET<span>SUBS ?</span></div>
    </Link>
    <div className="nav-right">
      <Link to="/" className="nav-link hide-mobile">Home</Link>
      <Link to="/refer" className="refer-btn-nav">
        <Users size={16} /> <span className="hide-mobile">Refer & Earn</span>
      </Link>
      <ConnectButton 
        showBalance={false} 
        chainStatus="icon" 
        accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }} 
      />
    </div>
  </nav>
);

// ==================== FOOTER ====================
const Footer = () => (
  <footer className="footer-modern">
    <div className="footer-content">
      <div className="footer-brand">
        <Link to="/" className="logo">FORGET<span>SUBS</span></Link>
        <p style={{ marginTop: '1rem' }}>
          Privacy-first subscription analyzer. Your file is processed locally, only redacted text touches our servers.
        </p>
      </div>
      <div className="footer-col">
        <h4>Platform</h4>
        <div className="footer-links">
          <Link to="/" className="footer-link">Home</Link>
          <Link to="/refer" className="footer-link">Refer & Earn</Link>
          <a href="https://x.com/OctoNads" className="footer-link" target="_blank" rel="noopener noreferrer">Twitter</a>
        </div>
      </div>
      <div className="footer-col">
        <h4>Information</h4>
        <div className="footer-links">
          <Link to="/privacy" className="footer-link">Privacy Policy</Link>
          <Link to="/terms" className="footer-link">Terms of Service</Link>
          <a href="https://forms.gle/1kKv79XCea5xKmgC8" className="footer-link" target="_blank" rel="noopener noreferrer">Contact Us</a>
        </div>
      </div>
    </div>
    <div className="footer-bottom">
      <div>© 2026 FORGETSUBS. All rights reserved.</div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <span>Client-First.</span>
        <span>Private.</span>
        <span>Secure.</span>
      </div>
    </div>
  </footer>
);

// ==================== FAQ SECTION ====================
const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const faqs = [
    { q: "Is my data really safe?", a: "YES! Your PDF is processed in your browser. We extract and redact locally, then send only the redacted text to our server for AI analysis. Your original file never leaves your device." },
    { q: "What data reaches your server?", a: "Only redacted transaction text with all personal info (names, account numbers, addresses) removed. The server analyzes this anonymized text and immediately purges it after sending results." },
    { q: "How does the Refer & Earn work?", a: "Share your unique link. When friends unlock their report, you earn 1.5 USDC instantly." },
    { q: "Which blockchains do you support?", a: "We support USDC payments on Monad Mainnet, BNB Smart Chain (BSC), Base, and Ethereum." }
  ];

  return (
    <section className="faq-section">
      <h2 className="section-title">Common Questions</h2>
      <div className="faq-container">
        {faqs.map((faq, i) => (
          <div key={i} className={`faq-item ${openIndex === i ? 'open' : ''}`}>
            <div className="faq-question" onClick={() => setOpenIndex(openIndex === i ? null : i)}>
              {faq.q}
              <ChevronDown className="faq-icon" size={20} />
            </div>
            {openIndex === i && <div className="faq-answer">{faq.a}</div>}
          </div>
        ))}
      </div>
    </section>
  );
};

// ==================== HOME PAGE ====================
const HomePage = () => {
  const { address, isConnected, chain } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { signMessageAsync } = useSignMessage();

  const [summaryData, setSummaryData] = useState(null);
  const [detailedReport, setDetailedReport] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState('idle');
  const [verifyError, setVerifyError] = useState('');
  const [reportId, setReportId] = useState(null);
  const [hasPaidSubscription, setHasPaidSubscription] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  // Check if user has already paid for subscription
  useEffect(() => {
    const checkPaidSubscription = async () => {
      if (!address) {
        setHasPaidSubscription(false);
        return;
      }

      setCheckingSubscription(true);
      try {
        const { data, error } = await supabase
          .from('paid_subscriptions')
          .select('wallet_address')
          .eq('wallet_address', address.toLowerCase())
          .single();

        if (data && !error) {
          setHasPaidSubscription(true);
        } else {
          setHasPaidSubscription(false);
        }
      } catch (err) {
        setHasPaidSubscription(false);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkPaidSubscription();
  }, [address]);

  const validateFile = (file) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Only PDF files are supported');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return false;
    }
    return true;
  };

  // ==================== HYBRID PROCESSING ====================
  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    if (!validateFile(file)) return;

    setIsAnalyzing(true);
    setSummaryData(null);
    setDetailedReport(null);
    setReportId(null);

    try {
      // STEP 1: Extract text in browser (file never uploaded!)
      toast.loading('📄 Extracting text locally...', { id: 'extract' });
      const rawText = await extractTextFromPDF(file);
      toast.dismiss('extract');

      if (rawText.length < 100) {
        throw new Error('PDF appears to be empty or unreadable');
      }

      // STEP 2: Redact PII in browser (privacy protection!)
      toast.loading('🔒 Redacting personal info...', { id: 'redact' });
      const redactedText = redactSensitiveInfo(rawText);
      toast.dismiss('redact');

      
      const response = await fetch(`${API_URL}/analyze-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: redactedText.substring(0, 200000) // Limit size
        }),
      });

      toast.dismiss('analyze');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      
      if (!data.isBankStatement) {
        toast.error(data.error || 'Invalid bank statement');
        return;
      }

      setSummaryData(data);
      setReportId(data.reportId);
      toast.success(`Found ${data.subscriptionCount} subscriptions!`);

    } catch (error) {
      toast.error(error.message || 'Failed to analyze file. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    disabled: isAnalyzing
  });

  // ==================== HELPER FUNCTIONS ====================
  // Helper function to save paid subscription to Supabase
  const savePaidSubscription = async (walletAddress, txHash, chainId) => {
    try {
      const { data, error } = await supabase
        .from('paid_subscriptions')
        .upsert({
          wallet_address: walletAddress.toLowerCase(),
          chain_id: chainId,
          tx_hash: txHash,
          amount: 5.00,
          last_verified_at: new Date().toISOString()
        }, {
          onConflict: 'wallet_address',
          ignoreDuplicates: false
        });

      if (error) {
        return false;
      }

      setHasPaidSubscription(true);
      return true;
    } catch (err) {
      return false;
    }
  };

  // Helper function to verify ownership for existing subscribers
  const verifySubscriptionOwnership = async (walletAddress) => {
    try {
      const message = `ForgetSubs: Verify wallet ownership for ${walletAddress} at ${Date.now()}`;
      const signature = await signMessageAsync({ message });

      // Update last_verified_at in Supabase
      const { error } = await supabase
        .from('paid_subscriptions')
        .update({ last_verified_at: new Date().toISOString() })
        .eq('wallet_address', walletAddress.toLowerCase());

      if (error) {
        return false;
      }

      return true;
    } catch (err) {
      return false;
    }
  };

  // ==================== PAYMENT UNLOCK ====================
  const handlePayUnlock = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!reportId) {
      toast.error('No report to unlock');
      return;
    }

    // Check if user already has paid subscription
    if (hasPaidSubscription) {
      // Just verify ownership with signature
      setVerifyStatus('processing');
      setVerifyError('');

      try {
        const verified = await verifySubscriptionOwnership(address);
        
        if (!verified) {
          throw new Error('Ownership verification failed');
        }

        setVerifyStatus('verifying');
        
        // Unlock the report
        const unlockResponse = await fetch(`${API_URL}/unlock-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId,
            method: 'payment',
            walletAddress: address.toLowerCase(),
            existingSubscriber: true
          })
        });

        if (!unlockResponse.ok) {
          const errorData = await unlockResponse.json();
          throw new Error(errorData.error || 'Failed to unlock report');
        }

        const unlockData = await unlockResponse.json();
        setDetailedReport(unlockData.detailedData);
        setVerifyStatus('success');
        toast.success('Report unlocked successfully!');
        
        setTimeout(() => setVerifyStatus('idle'), 2000);

      } catch (err) {
        
        // Check if user rejected the signature
        if (err.message?.includes('User rejected') || err.message?.includes('User denied')) {
          setVerifyStatus('denied');
          setVerifyError('Transaction cancelled by user');
          setTimeout(() => setVerifyStatus('idle'), 3000);
        } else {
          setVerifyStatus('error');
          setVerifyError(err.message || 'Verification failed');
        }
      }
      return;
    }

    // User needs to pay - proceed with payment flow
    setVerifyStatus('processing');
    setVerifyError('');

    try {
      const chainId = chain?.id;
      if (!chainId || !USDC_ADDRESSES[chainId]) {
        toast.error('Please switch to a supported network (Monad, BSC, Base, or Ethereum)');
        setVerifyStatus('idle');
        return;
      }

      const usdcAddress = USDC_ADDRESSES[chainId];
      const amount = parseUnits('5', 6);

      const txHash = await writeContractAsync({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [RECEIVER_WALLET, amount],
      });

      toast.loading('Waiting for confirmation...', { id: 'tx-confirm' });
      setVerifyStatus('verifying');

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      toast.dismiss('tx-confirm');

      // Save to Supabase
      await savePaidSubscription(address, txHash, chainId);

      const unlockResponse = await fetch(`${API_URL}/unlock-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          method: 'payment',
          chainId,
          txHash,
        }),
      });

      if (!unlockResponse.ok) {
        const errorData = await unlockResponse.json();
        throw new Error(errorData.error || 'Unlock failed');
      }

      const unlockData = await unlockResponse.json();
      setDetailedReport(unlockData.detailedData);
      setVerifyStatus('success');
      toast.success('Report unlocked successfully!');

      setTimeout(() => setVerifyStatus('idle'), 2000);

      const referrerCode = localStorage.getItem('referrer_code');
      if (referrerCode) {
        try {
          await fetch(`${API_URL}/claim-referral`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referrerCode,
              txHash,
              chainId,
              payerAddress: address,
            }),
          });
          localStorage.removeItem('referrer_code');
        } catch (refErr) {
        }
      }
    } catch (error) {
      
      // Check if user rejected the transaction
      if (error.message?.includes('User rejected') || error.message?.includes('User denied')) {
        setVerifyStatus('denied');
        setVerifyError('Transaction cancelled by user');
        setTimeout(() => setVerifyStatus('idle'), 3000);
      } else {
        setVerifyStatus('error');
        setVerifyError(error.message || 'Payment failed. Please try again.');
      }
    }
  };

  // ==================== NFT UNLOCK ====================
  const handleNftUnlock = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!reportId) {
      toast.error('No report to unlock');
      return;
    }

    setVerifyStatus('processing');
    setVerifyError('');

    try {
      const message = `Unlock Report: ${reportId}`;
      const signature = await signMessageAsync({ message });

      setVerifyStatus('verifying');

      const unlockResponse = await fetch(`${API_URL}/unlock-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          method: 'nft',
          signature,
          address,
        }),
      });

      if (!unlockResponse.ok) {
        const errorData = await unlockResponse.json();
        throw new Error(errorData.error || 'Unlock failed');
      }

      const unlockData = await unlockResponse.json();
      setDetailedReport(unlockData.detailedData);
      setVerifyStatus('success');
      toast.success('Report unlocked with NFT!');

      setTimeout(() => setVerifyStatus('idle'), 2000);
    } catch (error) {
      
      // Check if user rejected the signature
      if (error.message?.includes('User rejected') || error.message?.includes('User denied')) {
        setVerifyStatus('denied');
        setVerifyError('Transaction cancelled by user');
        setTimeout(() => setVerifyStatus('idle'), 3000);
      } else {
        setVerifyStatus('error');
        setVerifyError(error.message || 'NFT verification failed');
      }
    }
  };

  // ==================== CHART DATA ====================
  const lockedPieData = {
    labels: ['Locked'],
    datasets: [{
      data: [100],
      backgroundColor: ['rgba(255, 255, 255, 0.1)'],
      borderWidth: 0
    }]
  };

  const unlockedPieData = detailedReport ? {
    labels: detailedReport.subscriptions.map(s => s.name),
    datasets: [{
      data: detailedReport.subscriptions.map(s => s.monthlyAmount),
      backgroundColor: [
        '#00ffa3', '#60efff', '#ff6b6b', '#ffd93d', '#a78bfa',
        '#fb923c', '#ec4899', '#14b8a6', '#f472b6', '#8b5cf6'
      ],
      borderWidth: 2,
      borderColor: '#050505'
    }]
  } : lockedPieData;

  return (
    <>
      <Toaster position="top-center" />
      <VerificationModal
        isOpen={verifyStatus !== 'idle'}
        status={verifyStatus}
        error={verifyError}
        onClose={() => {
          setVerifyStatus('idle');
          setVerifyError('');
        }}
      />

      <header className="hero">
        <h1>
          Find Your <span className="gradient-text">Money Leaks</span>
        </h1>
         <h3>Track Forgotten Subscriptions, Cancel & <span className="gradient-text">Save up to $700/year</span>.</h3>

        {!summaryData && (
          <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
            <input {...getInputProps()} />
            {isAnalyzing ? (
              <div className="loader-container">
                <span className="loader"></span>
                <p style={{ marginTop: '1rem' }}>Processing...</p>
              </div>
            ) : (
              <>
                <div className="drop-icon">📄</div>
                <p className="dropzone-text">
                  {isDragActive ? "Drop PDF now" : "Upload Bank/Card Statement in Pdf/CSV"}
                </p>
                <div className="privacy-pill">🔒 File Stays on Your Device , Local Processing for Security & Privacy</div>
              </>
            )}
          </div>
        )}
      </header>

      <div className="ticker-mask">
        <div className="ticker-track">
          {[...SUBSCRIPTION_ICONS, ...SUBSCRIPTION_ICONS].map((icon, i) => (
            <img key={i} src={icon.src} alt={icon.name} style={icon.style || {}} />
          ))}
        </div>
      </div>

      {summaryData && (
        <section className="dashboard-layout">
          <div className="dashboard-top-row">
            <div className="stats-column">
              <div className="stat-card">
                <div className="stat-label">Estimated Annual Money Leak</div>
                <div className="stat-value green">
                  {summaryData.currencySymbol}{summaryData.totalAnnualWaste.toFixed(2)}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Active Subscriptions</div>
                {detailedReport ? (
                  <div className="stat-value blue">{detailedReport.subscriptions.length}</div>
                ) : (
                  <div className="stat-value" style={{ color: '#555', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Lock size={32} /> <span style={{ fontSize: '1.5rem' }}>Locked</span>
                  </div>
                )}
              </div>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">Monthly Breakdown</h3>
              <div className="chart-wrapper" style={{ position: 'relative' }}>
                {!detailedReport && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 10, color: '#fff', flexDirection: 'column', gap: '10px'
                  }}>
                    <Lock size={40} color="#00ffa3" />
                    <span style={{ fontWeight: 'bold' }}>Analytics Locked</span>
                  </div>
                )}
                <Pie
                  data={detailedReport ? unlockedPieData : lockedPieData}
                  options={{
                    plugins: { legend: { position: 'bottom', display: !!detailedReport } },
                    maintainAspectRatio: false,
                    responsive: true
                  }}
                />
              </div>
            </div>
          </div>

          <div className="report-container">
            {!detailedReport ? (
              <div className="glass-paywall">
                <div className="paywall-icon-circle"><Lock size={36} color="#00ffa3" /></div>
                <h3 className="paywall-title">Unlock Detailed Report</h3>
                <p className="paywall-desc">Reveal merchant names, exact dates, and one-click cancellation links.</p>
                
                {hasPaidSubscription && !checkingSubscription && (
                  <div style={{ 
                    marginBottom: '1rem', 
                    padding: '0.75rem',
                    background: 'rgba(0, 255, 163, 0.1)',
                    border: '1px solid rgba(0, 255, 163, 0.3)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#00ffa3',
                    fontSize: '0.9rem'
                  }}>
                    <CheckCircle2 size={16} />
                    <span>You have lifetime access - just verify ownership to unlock!</span>
                  </div>
                )}
                
                <div className="unlock-options">
                  {hasPaidSubscription ? (
                    <button onClick={handlePayUnlock} disabled={verifyStatus !== 'idle'} className="unlock-btn">
                      <div className="btn-content">
                        <div className="btn-title"><CheckCircle2 size={18} color="#00ffa3" /> Verify Ownership</div>
                        <span className="btn-sub">You have lifetime access - just sign to verify</span>
                      </div>
                      <ArrowRight size={20} />
                    </button>
                  ) : (
                    <button onClick={handlePayUnlock} disabled={verifyStatus !== 'idle'} className="unlock-btn">
                      <div className="btn-content">
                        <div className="btn-title"><Coins size={18} color="#00ffa3" /> Pay 5 USDC</div>
                        <span className="btn-sub">Monad • BSC • Base • Ethereum</span>
                      </div>
                      <ArrowRight size={20} />
                    </button>
                  )}
                  <button onClick={handleNftUnlock} disabled={verifyStatus !== 'idle'} className="unlock-btn">
                    <div className="btn-content">
                      <div className="btn-title"><Gem size={18} color="#60efff" /> Holder Unlock</div>
                      <span className="btn-sub">Sign to verify (2+ Octonads)</span>
                    </div>
                    <ArrowRight size={20} />
                  </button>
                </div>
                {!isConnected && (
                  <div style={{ marginTop: '1.5rem', color: '#ff6b6b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Wallet size={14} /> Connect Wallet to unlock
                  </div>
                )}
              </div>
            ) : (
              <div className="report-content">
                <div className="report-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle2 color="#00ffa3" />
                    <div>
                      <h3 className="report-title">Full Report</h3>
                      <span style={{ fontSize: '0.75rem', color: '#00ffa3' }}>Verified & Unlocked</span>
                    </div>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Monthly Charges</th>
                        <th>Paid Total</th>
                        <th>Paid Months</th>
                        <th>Last Paid Date</th>
                        <th>Yearly Cost</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedReport.subscriptions.map((sub, idx) => (
                        <tr key={idx}>
                          <td>
                            <div className="service-flex">
                              <div className="service-icon-box">{sub.name.charAt(0)}</div>
                              {sub.name}
                            </div>
                          </td>
                          <td>{detailedReport.currencySymbol}{sub.monthlyAmount.toFixed(2)}</td>
                          <td>{detailedReport.currencySymbol}{sub.totalPaid.toFixed(2)}</td>
                          <td>{sub.paidMonths}</td>
                          <td style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                            {sub.lastDate || 'N/A'}
                          </td>
                          <td style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                            {detailedReport.currencySymbol}{sub.annualCost.toFixed(2)}
                          </td>
                          <td>
                            <a 
                              href={sub.cancelUrl || '#'} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="cancel-link"
                            >
                              Cancel <ExternalLink size={14} />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Share on X Button */}
                <div style={{ 
                  marginTop: '2rem', 
                  paddingTop: '2rem', 
                  borderTop: '1px solid var(--card-border)',
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  <button
                    onClick={() => {
                      const text = `I just discovered I'm wasting ${detailedReport.currencySymbol}${summaryData.totalAnnualWaste.toFixed(2)}/year on forgotten subscriptions using ForgetSubs! 💸

Check your money leaks: https://forgetsubs.com`;
                      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
                      window.open(twitterUrl, '_blank', 'width=550,height=420');
                    }}
                    style={{
                      background: '#1DA1F2',
                      border: 'none',
                      padding: '0.75rem 2rem',
                      borderRadius: '12px',
                      color: '#fff',
                      fontWeight: '600',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'transform 0.2s, background 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = 'scale(1.05)';
                      e.target.style.background = '#1a8cd8';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'scale(1)';
                      e.target.style.background = '#1DA1F2';
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Share on X
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="trust-section">
        <h2 className="section-title">Privacy-First Architecture</h2>
        <div className="trust-grid">
          <div className="trust-card">
            <ShieldCheck size={32} color="#00ffa3" style={{ marginBottom: '1rem' }} />
            <h4>Local Processing</h4>
            <p>Your Statement is extracted and processed entirely in your browser. The file never leaves your device.</p>
          </div>
          <div className="trust-card">
            <Zap size={32} color="#00ffa3" style={{ marginBottom: '1rem' }} />
            <h4>Client-Side Redaction</h4>
            <p>All personal info (names, accounts, addresses etc) is stripped in your browser before any data is sent for Analyse.</p>
          </div>
          <div className="trust-card">
            <Trash2 size={32} color="#00ffa3" style={{ marginBottom: '1rem' }} />
            <h4>Immediate Server Purge</h4>
            <p>Server receives only redacted text for AI analysis, then immediately deletes it after sending results.</p>
          </div>
        </div>
      </section>

      <FaqSection />
    </>
  );
};

// ==================== APP SHELL ====================
function App() {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();

 useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('referrer_code', ref);
      fetch(`${API_URL}/referral-click`, {
        method: 'POST',
        body: JSON.stringify({ code: ref }),
        headers: { 'Content-Type': 'application/json' }
      }).catch(console.error);
    }
  }, [searchParams]);

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <ErrorBoundary>
      <div className="app-shell">
        <Navbar />
        <div className="container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/refer" element={<ReferPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </ErrorBoundary>
  );
}

export default App;