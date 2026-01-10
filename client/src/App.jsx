// App.jsx
import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  ShieldCheck, Zap, Trash2, Lock, CheckCircle2, Coins, Gem, 
  ArrowRight, Wallet, ExternalLink, AlertCircle, Users, ChevronDown 
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, usePublicClient, useReadContract } from 'wagmi';
import { parseUnits, erc20Abi, erc721Abi } from 'viem';
import { Routes, Route, useSearchParams, Link, useLocation } from 'react-router-dom';

import './App.css';
import ReferPage from './ReferPage';
import { PrivacyPage, TermsPage } from './LegalPages';

ChartJS.register(ArcElement, Tooltip, Legend);

const API_URL = import.meta.env.VITE_API_URL
const SUBSCRIPTION_ICONS = [
  { 
    name: "Netflix", 
    src: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" 
  },
  { 
    name: "Spotify", 
    src: "https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg" 
  },
  { 
    name: "Disney+", 
    src: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg" 
  },
  { 
    name: "Amazon Prime", 
    src: "https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg" 
  },
  { 
    name: "Adobe", 
    src: "https://www.clipartmax.com/png/middle/207-2078951_logo-adobe-creative-cloud-logo-png.png" 
  },
  { 
    name: "Hulu", 
    src: "https://download.logo.wine/logo/Hulu/Hulu-Logo.wine.png"
  },
  
  { 
    name: "Audible", 
    src: "https://cdn.freebiesupply.com/logos/thumbs/2x/audible-logo.png" 
  },
  { 
    name: "Discord", 
    src: "https://pngimg.com/d/discord_PNG11.png" 
  },
  { 
    name: "Google One", 
    src: "https://cdn.freebiesupply.com/logos/thumbs/2x/google-1-logo.png" 
  },
  { 
    name: "NordVPN", 
    src: "https://1000logos.net/wp-content/uploads/2022/08/NordVPN-Emblem.png" 
  },
  { 
    name: "Paramount+", 
    src: "https://www.pngall.com/wp-content/uploads/15/Paramount-Plus-Logo-No-Background.png" 
  },
  { 
    name: "SoundCloud", 
    src: "https://www.nicepng.com/png/detail/18-183578_soundcloud-logo.png" 
  },
  { 
    name: "Canva", 
    src: "https://1000logos.net/wp-content/uploads/2023/02/Canva-Logo-2013.png" 
  },

  // --- EXTRAS FOR VARIETY ---
  { 
    name: "YouTube Premium", 
    src: "https://upload.wikimedia.org/wikipedia/commons/d/dd/YouTube_Premium_logo.svg" 
  },
  { 
    name: "Max (HBO)", 
    src: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Max_logo.svg" 
  },
  { 
    name: "Twitch", 
    src: "https://upload.wikimedia.org/wikipedia/commons/d/d3/Twitch_Glitch_Logo_Purple.svg" 
  },
  { 
    name: "Apple TV+", 
    src: "https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg" 
  },
  { 
    name: "Microsoft 365", 
    src: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" 
  },
  { 
    name: "ChatGPT", 
    src: "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg",
    style: { filter: "invert(1)" } 
  }
];


const RECEIVER_WALLET = "0xACe6f654b9cb7d775071e13549277aCd17652EAF";
const OCTONADS_CONTRACT = "0x51840Af9f4b780556DEdE2C7aDa0d4344034a65f";
const MONAD_CHAIN_ID = 143;
const USDC_ADDRESSES = {
  143: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
  56: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
};

// --- COMPONENTS ---

const VerificationModal = ({ isOpen, status, error, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel center-text" style={{ maxWidth: '350px' }}>
        {status === 'processing' && (
          <>
            <div className="spinner-ring large"></div>
            <h3>Confirm in Wallet</h3>
            <p className="modal-desc">Please sign the transaction in your wallet...</p>
          </>
        )}
        {status === 'verifying' && (
          <>
            <div className="spinner-ring large pulse"></div>
            <h3>Verifying Transaction</h3>
            <p className="modal-desc">Waiting for blockchain confirmation...</p>
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
            <button className="modal-btn" onClick={onClose}>Close</button>
          </>
        )}
      </div>
    </div>
  );
};

const Navbar = () => {
  return (
    <nav className="navbar-modern">
      <Link to="/" className="logo">FORGET<span>SUBS ?</span></Link>
      <div className="nav-right">
        <Link to="/" className="nav-link hide-mobile">Home</Link>
        <Link to="/refer" className="refer-btn-nav">
          <Users size={16} /> <span className="hide-mobile">Refer & Earn</span>
        </Link>
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }} />
      </div>
    </nav>
  );
};

const Footer = () => {
  return (
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
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="footer-link">Twitter</a>
          </div>
        </div>
        <div className="footer-col">
          <h4>Legal</h4>
          <div className="footer-links">
            <Link to="/privacy" className="footer-link">Privacy Policy</Link>
            <Link to="/terms" className="footer-link">Terms of Service</Link>
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
};

const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState(null);
  
  const faqs = [
    {
      q: "Is my data really safe?",
      a: "Yes. We use a 'RAM-Only' processing model. Your PDF is uploaded to server memory, analyzed by AI with personal data redacted, and then immediately destroyed. We never save your files to a database or disk."
    },
    {
      q: "How does the Refer & Earn work?",
      a: "Grab your unique link from the Referral page. Share it with friends. When they upload a statement and pay to unlock the full report, you instantly receive 1.5 USDC to your wallet."
    },
    {
      q: "Which blockchains do you support?",
      a: "We support payments on Monad Mainnet, BNB Smart Chain (BSC), Base, and Ethereum. You can pay with USDC on any of these chains."
    },
    {
      q: "Can I use this for free?",
      a: "You get a free summary (total waste calculation) immediately. The detailed report with cancellation links requires a small 5 USDC fee, or it's free if you hold 2+ OCTONADS NFTs."
    }
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
            <div className="faq-answer">
              <p>{faq.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// --- MAIN PAGE COMPONENT ---

const HomePage = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [isReportUnlocked, setIsReportUnlocked] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState('idle');
  const [verifyError, setVerifyError] = useState(null);
  
  const { address, isConnected, chain } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const currencySymbol = analysisData?.currencySymbol || '$';

  const { refetch: refetchNft } = useReadContract({
    address: OCTONADS_CONTRACT,
    abi: erc721Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: MONAD_CHAIN_ID,
    query: { enabled: false }
  });

  const handlePayUnlock = async () => {
    if (!isConnected || !address || !chain || !USDC_ADDRESSES[chain.id]) {
      alert("Connect wallet / unsupported network");
      return;
    }
    try {
      setVerifyStatus('processing');
      const hash = await writeContractAsync({
        address: USDC_ADDRESSES[chain.id],
        abi: erc20Abi,
        functionName: 'transfer',
        args: [RECEIVER_WALLET, parseUnits('5', 6)],
      });
      setVerifyStatus('verifying');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === 'success') {
        setVerifyStatus('success');
        setTimeout(() => {
          setIsReportUnlocked(true);
          setVerifyStatus('idle');
        }, 2000);
        // Referral logic
        const referrerCode = localStorage.getItem('referrer_code');
        if (referrerCode) {
          await fetch(`${API_URL}/claim-referral`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ referrerCode, txHash: hash, chainId: chain.id, payerAddress: address })
          });
          localStorage.removeItem('referrer_code');
        }
      } else {
        throw new Error("Transaction failed");
      }
    } catch (err) {
      setVerifyStatus('error');
      setVerifyError(err.message.split('\n')[0]);
    }
  };

  const handleNftUnlock = async () => {
    if (!chain || chain.id !== MONAD_CHAIN_ID) return alert("Switch to Monad Network");
    try {
      setVerifyStatus('verifying');
      await new Promise(r => setTimeout(r, 1000));
      const result = await refetchNft();
      if (Number(result.data || 0) >= 2) {
        setVerifyStatus('success');
        setTimeout(() => {
          setIsReportUnlocked(true);
          setVerifyStatus('idle');
        }, 2000);
      } else {
        setVerifyStatus('error');
        setVerifyError("Access Denied. You need 2+ Octonads.");
      }
    } catch (err) {
      setVerifyStatus('error');
      setVerifyError(err.message);
    }
  };

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    setAnalysisData(null);
    const formData = new FormData();
    acceptedFiles.forEach(file => formData.append('files', file));
    try {
      const response = await fetch(`${API_URL}/analyze`, { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed");
      setAnalysisData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: false
  });

  const pieData = {
    labels: analysisData?.subscriptions?.map(s => s.name) || [],
    datasets: [{
      data: analysisData?.subscriptions?.map(s => s.monthlyAmount) || [],
      backgroundColor: ['#00ffa3', '#60efff', '#ff6b6b', '#ffd93d', '#6c5ce7'],
      borderWidth: 1,
      borderColor: '#ffffff'
    }]
  };

  return (
    <>
      <VerificationModal 
        isOpen={verifyStatus !== 'idle'} 
        status={verifyStatus} 
        error={verifyError}
        onClose={() => setVerifyStatus('idle')}
      />

      <header className="hero">
        <h1>Stop the <span className="gradient-text">Money Leak.</span></h1>
        <h3>Track Forgotten Subscription , Cancel & <span className="gradient-text">Save upto $700 .</span></h3>

        

        {error && <div className="error-msg"><AlertCircle size={20} style={{ display: 'inline', verticalAlign: 'middle' }} /> {error}</div>}

        {!analysisData && (
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
                <div className="privacy-pill">Safe & Secured </div>
              </>
            )}
          </div>
        )}
      </header>

      <div className="ticker-mask">
          <div className="ticker-track">
            {[...SUBSCRIPTION_ICONS, ...SUBSCRIPTION_ICONS].map((icon, i) => (
              <img key={i} src={icon.src} alt={icon.name} />
            ))}
          </div>
        </div>

      {analysisData && (
        <section className="dashboard-layout">
          <div className="dashboard-top-row">
            <div className="stats-column">
              <div className="stat-card">
                <div className="stat-label">Estimated Annual Waste</div>
                <div className="stat-value green">{currencySymbol}{analysisData.totalAnnualWaste}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Active Subscriptions</div>
                <div className="stat-value blue">{analysisData.subscriptions.length}</div>
              </div>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">Monthly Breakdown</h3>
              <div className="chart-wrapper">
                <Pie data={pieData} options={{
                  plugins: { legend: { position: 'bottom', labels: { color: '#999', boxWidth: 10 } } },
                  maintainAspectRatio: false,
                  responsive: true
                }} />
              </div>
            </div>
          </div>

          <div className="report-container">
            {!isReportUnlocked ? (
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
                      <span className="btn-sub">Free for 2+ Octonads</span>
                    </div>
                    <ArrowRight size={20} />
                  </button>
                </div>
                {!isConnected && (
                  <div className="wallet-warning">
                    <Wallet size={12} style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Connect Wallet to enable buttons
                  </div>
                )}
              </div>
            ) : (
              <div className="report-content">
                <div className="report-header">
                  <div style={{display:'flex', alignItems:'center', gap: '10px'}}>
                    <CheckCircle2 color="#00ffa3" />
                    <div><h3 className="report-title">Full Report</h3><span style={{ fontSize: '0.75rem', color: '#00ffa3' }}>Verified & Unlocked</span></div>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="modern-table">
                    <thead><tr><th>Service</th><th>Monthly</th><th>Paid Total</th><th>Months</th><th>Yearly Cost</th><th>Action</th></tr></thead>
                    <tbody>
                      {analysisData.subscriptions.map((sub, idx) => (
                        <tr key={idx}>
                          <td><div className="service-flex"><div className="service-icon-box">{sub.name.charAt(0)}</div>{sub.name}</div></td>
                          <td>{currencySymbol}{sub.monthlyAmount.toFixed(2)}</td>
                          <td>{currencySymbol}{sub.totalPaid.toFixed(2)}</td>
                          <td>{sub.paidMonths}</td>
                          <td style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{currencySymbol}{sub.annualCost.toFixed(2)}</td>
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

      <section className="trust-section">
        <h2 className="section-title">Safe. Secure. Private.</h2>
        <div className="trust-grid">
          <div className="trust-card">
            <ShieldCheck size={32} color="#00ffa3" style={{ marginBottom: '1rem' }} />
            <h4>RAM-Only Processing</h4>
            <p>Your files are processed in your Browser memory. We never save your data.</p>
          </div>
          <div className="trust-card">
            <Zap size={32} color="#00ffa3" style={{ marginBottom: '1rem' }} />
            <h4>Redaction First</h4>
            <p>Our Web strips personal details before analysis.</p>
          </div>
          <div className="trust-card">
            <Trash2 size={32} color="#00ffa3" style={{ marginBottom: '1rem' }} />
            <h4>Auto-Destruct</h4>
            <p>Data is purged immediately after analysis.</p>
          </div>
        </div>
      </section>
      
      <FaqSection />
    </>
  );
};

// --- APP SHELL ---

function App() {
  const [searchParams] = useSearchParams();

  // Capture referral code on any page load
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('referrer_code', ref);
      fetch(`${API_URL}/referral-click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: ref })
      }).catch(err => console.error("Referral tracking failed", err));
    }
  }, [searchParams]);

  // Scroll to top on route change
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

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