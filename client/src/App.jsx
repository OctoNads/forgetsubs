// App.jsx
import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Lock, CheckCircle2, Coins, Gem,
  ArrowRight, Wallet, ExternalLink, AlertCircle, Users, ChevronDown
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, usePublicClient, useSignMessage } from 'wagmi';
import { parseUnits, erc20Abi } from 'viem';
import { Routes, Route, useSearchParams, Link, useLocation } from 'react-router-dom';

import './App.css';
import ReferPage from './ReferPage';
import { PrivacyPage, TermsPage } from './LegalPages';

ChartJS.register(ArcElement, Tooltip, Legend);

const API_URL = import.meta.env.VITE_API_URL
const RECEIVER_WALLET = "0xACe6f654b9cb7d775071e13549277aCd17652EAF";
const MONAD_CHAIN_ID = 143;
const USDC_ADDRESSES = {
  143: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
  56: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
};

const SUBSCRIPTION_ICONS = [
  { name: "Netflix", src: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" },
  { name: "Spotify", src: "https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg" },
  { name: "Disney+", src: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg" },
  { name: "Amazon Prime", src: "https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg" },
  { name: "Adobe", src: "https://www.clipartmax.com/png/middle/207-2078951_logo-adobe-creative-cloud-logo-png.png" },
  { name: "Hulu", src: "https://download.logo.wine/logo/Hulu/Hulu-Logo.wine.png" },
  { name: "Audible", src: "https://cdn.freebiesupply.com/logos/thumbs/2x/audible-logo.png" },
  { name: "Discord", src: "https://pngimg.com/d/discord_PNG11.png" },
  { name: "Google One", src: "https://cdn.freebiesupply.com/logos/thumbs/2x/google-1-logo.png" },
  { name: "NordVPN", src: "https://1000logos.net/wp-content/uploads/2022/08/NordVPN-Emblem.png" },
  { name: "Paramount+", src: "https://www.pngall.com/wp-content/uploads/15/Paramount-Plus-Logo-No-Background.png" },
  { name: "SoundCloud", src: "https://www.nicepng.com/png/detail/18-183578_soundcloud-logo.png" },
  { name: "Canva", src: "https://1000logos.net/wp-content/uploads/2023/02/Canva-Logo-2013.png" },
  { name: "YouTube Premium", src: "https://upload.wikimedia.org/wikipedia/commons/d/dd/YouTube_Premium_logo.svg" },
  { name: "Max (HBO)", src: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Max_logo.svg" },
  { name: "Twitch", src: "https://upload.wikimedia.org/wikipedia/commons/d/d3/Twitch_Glitch_Logo_Purple.svg" },
  { name: "Apple TV+", src: "https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg" },
  { name: "Microsoft 365", src: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" },
  { name: "ChatGPT", src: "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg", style: { filter: "invert(1)" } }
];

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
        {status === 'error' && (
          <>
            <div className="error-icon-anim"><AlertCircle size={64} color="#ff6b6b" /></div>
            <h3>Failed</h3>
            <p className="modal-desc red">{error || "Something went wrong"}</p>
            <button className="modal-btn" style={{ marginTop: '1rem', background: 'var(--card-bg)', border: '1px solid white', padding: '0.5rem 1rem', borderRadius: '8px', color: 'white', cursor: 'pointer' }} onClick={onClose}>Close</button>
          </>
        )}
      </div>
    </div>
  );
};

const Navbar = () => (
  <nav className="navbar-modern">
    <Link 
      to="/" 
      className="logo" 
      style={{ display: 'flex', alignItems: 'center', gap: '1px' }}
    >
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

const Footer = () => (
  <footer className="footer-modern">
    <div className="footer-content">
      <div className="footer-brand">
        <Link to="/" className="logo">FORGET<span>SUBS</span></Link>
        <p style={{ marginTop: '1rem' }}>
          The AI-powered subscription killer. Securely analyze bank statements and stop the money leak instantly.
        </p>
      </div>
      <div className="footer-col">
        <h4>Platform</h4>
        <div className="footer-links">
          <Link to="/" className="footer-link">Home</Link>
          <Link to="/refer" className="footer-link">Refer & Earn</Link>
          <a href="https://x.com/OctoNads" className="footer-link">Twitter</a>
        </div>
      </div>
      <div className="footer-col">
        <h4>Information</h4>
        <div className="footer-links">
          <Link to="/privacy" className="footer-link">Privacy Policy</Link>
          <Link to="/terms" className="footer-link">Terms of Service</Link>
          <Link to="https://forms.gle/1kKv79XCea5xKmgC8" className="footer-link">Contact Us</Link>
        </div>
      </div>
    </div>
    <div className="footer-bottom">
      <div>© 2026 FORGETSUBS. All rights reserved.</div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <span>Secure.</span>
        <span>Private.</span>
        <span>Encrypted.</span>
      </div>
    </div>
  </footer>
);
const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const faqs = [
    { q: "Is my data really safe?", a: "Yes. We use a 'RAM-Only' processing model. Your PDF is uploaded to server memory, analyzed by AI with personal data redacted, and then immediately destroyed." },
    { q: "How does the Refer & Earn work?", a: "Grab your unique link from the Referral page. Share it. When friends unlock their report, you earn 1.5 USDC instantly." },
    { q: "Which blockchains do you support?", a: "We support USDC payments on Monad Mainnet, BNB Smart Chain (BSC), Base, and Ethereum." },
    { q: "Can I use this for free?", a: "You get a free summary immediately. The detailed report requires a small 5 USDC fee, or it's free if you hold 2+ OCTONADS NFTs." }
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
            <div className="faq-answer"><p>{faq.a}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
};

const HomePage = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // Split State: Summary (Public) vs Detailed (Private)
  const [summaryData, setSummaryData] = useState(null);
  const [detailedReport, setDetailedReport] = useState(null);

  const [verifyStatus, setVerifyStatus] = useState('idle');
  const [verifyError, setVerifyError] = useState(null);

  const { address, isConnected, chain } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();
  const publicClient = usePublicClient();

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    setSummaryData(null);
    setDetailedReport(null);

    const formData = new FormData();
    acceptedFiles.forEach(file => formData.append('files', file));

    try {
      // 1. Send file, get ONLY summary + reportId
      const response = await fetch(`${API_URL}/analyze`, { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed");

      setSummaryData(result); // Contains reportId, totalAnnualWaste, subscriptionCount
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: false
  });

  // --- UNLOCK HANDLERS ---
  const handlePayUnlock = async () => {
    if (!isConnected || !address || !chain || !USDC_ADDRESSES[chain.id]) {
      alert("Connect wallet / unsupported network");
      return;
    }
    try {
      setVerifyStatus('processing');
      // 1. Execute Payment on Blockchain
      const hash = await writeContractAsync({
        address: USDC_ADDRESSES[chain.id],
        abi: erc20Abi,
        functionName: 'transfer',
        args: [RECEIVER_WALLET, parseUnits('5', 6)],
      });

      setVerifyStatus('verifying');

      // Wait for block confirmation
      await publicClient.waitForTransactionReceipt({ hash });

      // 2. Server-Side Verification & Data Fetch
      const response = await fetch(`${API_URL}/unlock-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: summaryData.reportId,
          method: 'payment',
          txHash: hash,
          chainId: chain.id
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setDetailedReport(result.detailedData);
      setVerifyStatus('success');
      setTimeout(() => setVerifyStatus('idle'), 2000);

      // Trigger Referral Logic
      const referrerCode = localStorage.getItem('referrer_code');
      if (referrerCode) {
        fetch(`${API_URL}/claim-referral`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referrerCode, txHash: hash, chainId: chain.id, payerAddress: address })
        }).catch(console.error);
      }

    } catch (err) {
      console.error(err);
      setVerifyStatus('error');
      setVerifyError(err.message.split('\n')[0]);
    }
  };

  const handleNftUnlock = async () => {
    if (!chain || chain.id !== MONAD_CHAIN_ID) return alert("Switch to Monad Network");
    try {
      setVerifyStatus('processing');

      // 1. Sign Message to Prove Ownership
      const message = `Unlock Report: ${summaryData.reportId}`;
      const signature = await signMessageAsync({ message });

      setVerifyStatus('verifying');

      // 2. Server-Side Verification (Signature + Balance Check) & Data Fetch
      const response = await fetch(`${API_URL}/unlock-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: summaryData.reportId,
          method: 'nft',
          signature,
          address
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setDetailedReport(result.detailedData);
      setVerifyStatus('success');
      setTimeout(() => setVerifyStatus('idle'), 2000);

    } catch (err) {
      console.error(err);
      setVerifyStatus('error');
      setVerifyError(err.message);
    }
  };

  // --- UI RENDER HELPERS ---
  const lockedPieData = {
    labels: ['Hidden', 'Hidden', 'Hidden'],
    datasets: [{ data: [30, 40, 30], backgroundColor: ['#333', '#444', '#555'], borderWidth: 0 }]
  };

  const unlockedPieData = detailedReport ? {
    labels: detailedReport.subscriptions.map(s => s.name),
    datasets: [{
      data: detailedReport.subscriptions.map(s => s.monthlyAmount),
      backgroundColor: ['#00ffa3', '#60efff', '#ff6b6b', '#ffd93d', '#6c5ce7'],
      borderWidth: 1,
      borderColor: '#ffffff'
    }]
  } : null;

  return (
    <>
      <VerificationModal isOpen={verifyStatus !== 'idle'} status={verifyStatus} error={verifyError} onClose={() => setVerifyStatus('idle')} />

      <header className="hero">
        <h1>Stop the <span className="gradient-text">Money Leak.</span></h1>
        <h3>Track Forgotten Subscriptions, Cancel & <span className="gradient-text">Save up to $700/year</span>.</h3>

        {error && <div className="error-msg"><AlertCircle size={20} style={{ display: 'inline', verticalAlign: 'middle' }} /> {error}</div>}

        {!summaryData && (
          <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
            <input {...getInputProps()} />
            {isAnalyzing ? (
              <div className="loader-container">
                <span className="loader"></span>
                <p style={{ marginTop: '1rem' }}>Sublyzing...</p>
              </div>
            ) : (
              <>
                <div className="drop-icon">📄</div>
                <p className="dropzone-text">{isDragActive ? "Drop PDF now" : "Upload Bank/Card Statement PDF/CSV"}</p>
                <div className="privacy-pill">Safe & Secured</div>
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
                <div className="stat-label">Estimated Annual Waste</div>
                <div className="stat-value green">{summaryData.currencySymbol}{summaryData.totalAnnualWaste.toFixed(2)}</div>
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
                <div className="unlock-options">
                  <button onClick={handlePayUnlock} disabled={verifyStatus !== 'idle'} className="unlock-btn">
                    <div className="btn-content">
                      <div className="btn-title"><Coins size={18} color="#00ffa3" /> Pay 5 USDC</div>
                      <span className="btn-sub">Monad • BSC • Base • Ethereum</span>
                    </div>
                    <ArrowRight size={20} />
                  </button>
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
                    <div><h3 className="report-title">Full Report</h3><span style={{ fontSize: '0.75rem', color: '#00ffa3' }}>Verified & Unlocked</span></div>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="modern-table">
                    <thead><tr><th>Service</th><th>Monthly</th><th>Paid Total</th><th>Months</th><th>Yearly Cost</th><th>Action</th></tr></thead>
                    <tbody>
                      {detailedReport.subscriptions.map((sub, idx) => (
                        <tr key={idx}>
                          <td><div className="service-flex"><div className="service-icon-box">{sub.name.charAt(0)}</div>{sub.name}</div></td>
                          <td>{detailedReport.currencySymbol}{sub.monthlyAmount.toFixed(2)}</td>
                          <td>{detailedReport.currencySymbol}{sub.totalPaid.toFixed(2)}</td>
                          <td>{sub.paidMonths}</td>
                          <td style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{detailedReport.currencySymbol}{sub.annualCost.toFixed(2)}</td>
                          <td><a href={sub.cancelUrl || '#'} target="_blank" rel="noreferrer" className="cancel-link">Cancel <ExternalLink size={14} /></a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <div style={{ marginTop: '4rem' }}><FaqSection /></div>
    </>
  );
};

// --- APP SHELL ---
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
  );
}

export default App;