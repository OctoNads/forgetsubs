import React, { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { 
  Copy, Wallet, CheckCircle2, X, Share2, Twitter, 
  Youtube, TrendingUp, Award, Loader2, ChevronRight, DollarSign 
} from 'lucide-react';
import { supabase } from './supabase';

// Modern Animated Modal Component
const WithdrawModal = ({ onClose, availableBalance }) => {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('USDC');
  const [chainId, setChainId] = useState('8453'); 
  const [toAddress, setToAddress] = useState(address || '');
  const [status, setStatus] = useState('idle');

  const handleWithdrawProcess = async () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount < 5 || numAmount > availableBalance) {
      alert('Invalid amount (min $5, max available balance)');
      return;
    }
    if (!address) {
      alert('Wallet not connected');
      return;
    }

    setStatus('loading');
    try {
      const timestamp = Date.now().toString();
      const message = `ForgetSubs withdrawal request: ${amount} ${token} to ${toAddress} on chain ${chainId} timestamp:${timestamp}`;

      const signature = await signMessageAsync({ message });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          amount: numAmount,
          token,
          chainId: parseInt(chainId),
          toAddress,
          signature,
          timestamp
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed');

      setStatus('success');
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Withdrawal failed');
      setStatus('idle');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel modern-modal">
        <div className="modal-header">
          <h3>Withdraw Earnings</h3>
          <button className="close-btn" onClick={onClose} disabled={status !== 'idle'}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="input-group">
            <label>Amount (Min $5, Max: {availableBalance.toFixed(2)})</label>
            <div className="input-wrapper" style={{ position: 'relative' }}>
              <DollarSign size={16} className="input-icon" />
              <input 
                type="number" 
                min="5" 
                max={availableBalance} 
                step="0.01" 
                className="modern-input" 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                placeholder="0.00"
              />
              <button 
                type="button"
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,255,163,0.2)',
                  border: 'none',
                  color: '#00ffa3',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
                onClick={() => setAmount(availableBalance.toFixed(2))}
              >
                Max
              </button>
            </div>
          </div>

          <div className="row-group">
            <div className="input-group">
              <label>Token</label>
              <select className="modern-select" value={token} onChange={e => setToken(e.target.value)}>
                <option>USDC</option>
                <option>USDT</option>
              </select>
            </div>
            <div className="input-group">
              <label>Network</label>
              <select className="modern-select" value={chainId} onChange={e => setChainId(e.target.value)}>
                <option value="143">Monad</option>
                <option value="56">BSC</option>
                <option value="8453">Base</option>
                <option value="1">Ethereum</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label>Receiving Address</label>
            <input 
              type="text" 
              className="modern-input" 
              value={toAddress} 
              onChange={e => setToAddress(e.target.value)} 
              style={{ fontSize: '0.8rem', fontFamily: 'monospace' }} 
            />
          </div>

          <button 
            className={`action-btn ${status}`} 
            onClick={handleWithdrawProcess} 
            disabled={status !== 'idle'}
          >
            {status === 'idle' && <><span style={{marginRight: '5px'}}>Submit Request</span> <ChevronRight size={16} /></>}
            {status === 'loading' && <><Loader2 size={18} className="spin" /> Processing...</>}
            {status === 'success' && <><CheckCircle2 size={18} /> Request Sent!</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// Earnings Dashboard Modal
const EarningsModal = ({ onClose, availableBalance, lifetimeEarnings, withdrawals }) => {
  const [showWithdraw, setShowWithdraw] = useState(false);

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel modern-modal large">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="icon-badge"><Wallet size={20} color="#00ffa3"/></div>
            <h3>Earnings Dashboard</h3>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="earnings-summary">
          <div className="balance-display">
            <span>Available for Withdrawal</span>
            <h1>{availableBalance.toFixed(2)} <span className="currency">USDC</span></h1>
          </div>
          <button 
            className="withdraw-trigger-btn" 
            onClick={() => setShowWithdraw(true)} 
            disabled={availableBalance < 5}
          >
            Withdraw Funds {availableBalance < 5 && `(min $5)`}
          </button>
        </div>

        {showWithdraw && 
          <WithdrawModal 
            onClose={() => setShowWithdraw(false)} 
            availableBalance={availableBalance} 
          />
        }

        <div className="history-section">
          <h4>Transaction History</h4>
          <div className="table-scroll">
            {withdrawals.length === 0 ? (
              <div className="empty-state" style={{color:'var(--text-dim)', textAlign:'center', padding:'2rem'}}>
                No withdrawal history found.
              </div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Token</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map(w => (
                    <tr key={w.id}>
                      <td>{new Date(w.created_at).toLocaleDateString()}</td>
                      <td>{w.amount}</td>
                      <td>{w.token}</td>
                      <td>
                        <span className={`status-badge ${w.status?.toLowerCase() || 'pending'}`}>
                          {w.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main ReferPage Component
export default function ReferPage() {
  const { address, isConnected } = useAccount();
  const [userData, setUserData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const availableBalance = userData?.available_balance || 0;
  const lifetimeEarnings = userData?.earnings || 0;

  useEffect(() => {
    if (!address) return;

    const loadUser = async () => {
      let { data } = await supabase
        .from('users')
        .select('*')
        .eq('address', address.toLowerCase())
        .single();

      if (!data) {
        let code;
        do {
          code = Math.random().toString(36).substring(2, 10).toUpperCase();
          const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('referral_code', code)
            .single();
          if (!existing) break;
        } while (true);

        await supabase.from('users').insert({ 
          address: address.toLowerCase(), 
          referral_code: code 
        });

        const { data: newData } = await supabase
          .from('users')
          .select('*')
          .eq('address', address.toLowerCase())
          .single();
        data = newData;
      }
      setUserData(data);
    };

    loadUser();

    const channel = supabase
      .channel('user')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'users', 
        filter: `address=eq.${address.toLowerCase()}` 
      }, payload => {
        setUserData(payload.new);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [address]);

  useEffect(() => {
    const loadLeaderboard = async () => {
      const { data } = await supabase
        .from('users')
        .select('address,clicks,successful_refers,earnings')
        .order('successful_refers', { ascending: false })
        .limit(20);
      setLeaderboard(data || []);
    };

    loadLeaderboard();

    const channel = supabase
      .channel('leaderboard')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'users' 
      }, () => loadLeaderboard())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (!address) return;

    const loadHistory = async () => {
      const { data } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_address', address.toLowerCase())
        .order('created_at', { ascending: false });
      setWithdrawals(data || []);
    };

    loadHistory();

    const channel = supabase
      .channel('withdrawals')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'withdrawals', 
        filter: `user_address=eq.${address.toLowerCase()}` 
      }, () => loadHistory())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [address]);

  if (!isConnected) return <div className="container center-msg"><h2>Connect wallet to view dashboard</h2></div>;
  if (!userData) return <div className="container center-msg"><Loader2 className="spin" /> Loading Profile...</div>;

  const link = `https://forgetsubs.com/?ref=${userData.referral_code}`;

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container" style={{ padding: '4rem 1.5rem' }}>
      {/* Header */}
      <div className="hero-section-mini">
        <h1 className="section-title">Refer & <span className="highlight">Earn</span></h1>
        <p className="subtitle">Earn <strong>$1.5</strong> instantly for every friend who unlocks their report.</p>
      </div>

      {/* Unique Link */}
      <div className="link-container">
        <label>Your Unique Referral Link</label>
        <div className="copy-box modern">
          <input type="text" readOnly value={link} />
          <button onClick={copyLink} className={copied ? 'copied' : ''}>
            {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card-glass">
          <div className="stat-icon click"><Share2 size={20}/></div>
          <div className="stat-info">
            <span>Total Clicks</span>
            <strong>{userData.clicks}</strong>
          </div>
        </div>
        <div className="stat-card-glass">
          <div className="stat-icon success"><CheckCircle2 size={20}/></div>
          <div className="stat-info">
            <span>Successful Refers</span>
            <strong>{userData.successful_refers}</strong>
          </div>
        </div>
        <div className="stat-card-glass active" onClick={() => setShowEarningsModal(true)}>
          <div className="stat-icon money"><DollarSign size={20}/></div>
          <div className="stat-info">
            <span>Total Earnings (Lifetime)</span>
            <strong className="green">${lifetimeEarnings.toFixed(2)}</strong>
          </div>
          <div className="card-arrow"><ChevronRight size={16}/></div>
        </div>
      </div>

      {showEarningsModal && (
        <EarningsModal 
          onClose={() => setShowEarningsModal(false)} 
          availableBalance={availableBalance}
          lifetimeEarnings={lifetimeEarnings}
          withdrawals={withdrawals}
        />
      )}

      {/* --- HOW IT WORKS SECTION (Restored & Styled) --- */}
      <div style={{ maxWidth: '900px', margin: '6rem auto' }}>
        <h2 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '3rem' }}>How It Works</h2>
        <div className="trust-grid">
          <div className="trust-card" style={{ textAlign: 'center', position:'relative' }}>
            <div style={{ 
              background: 'rgba(0,255,163,0.1)', color:'var(--primary)', 
              width: '50px', height: '50px', borderRadius: '50%', 
              display:'flex', alignItems:'center', justifyContent:'center', 
              margin:'0 auto 1.5rem', fontWeight:'800', fontSize:'1.2rem',
              border:'1px solid rgba(0,255,163,0.2)'
            }}>1</div>
            <h4>Share Link</h4>
            <p>Copy your unique link and share it on socials with a proper post explaining the savings.</p>
          </div>
          <div className="trust-card" style={{ textAlign: 'center' }}>
            <div style={{ 
              background: 'rgba(96, 239, 255, 0.1)', color:'var(--secondary)', 
              width: '50px', height: '50px', borderRadius: '50%', 
              display:'flex', alignItems:'center', justifyContent:'center', 
              margin:'0 auto 1.5rem', fontWeight:'800', fontSize:'1.2rem',
              border:'1px solid rgba(96, 239, 255, 0.2)'
            }}>2</div>
            <h4>Friend Unlocks</h4>
            <p>User clicks your link, joins, and pays to unlock their detailed subscription report.</p>
          </div>
          <div className="trust-card" style={{ textAlign: 'center' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(0,255,163,0.2), rgba(96,239,255,0.2))', color:'#fff', 
              width: '50px', height: '50px', borderRadius: '50%', 
              display:'flex', alignItems:'center', justifyContent:'center', 
              margin:'0 auto 1.5rem', fontWeight:'800', fontSize:'1.2rem',
              border:'1px solid rgba(255,255,255,0.2)'
            }}>3</div>
            <h4>You Earn</h4>
            <p>You get <span className="highlight">$1.5</span> instantly added to your dashboard. Click & withdraw to any chain.</p>
          </div>
        </div>
      </div>

      {/* --- BOOST EARNINGS SECTION (Restored & Styled) --- */}
      <div style={{ maxWidth: '900px', margin: '0 auto 6rem' }}>
        <h2 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '3rem' }}>🚀 How to Earn More</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          
          <div className="stat-card-glass" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '2rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'1rem' }}>
              <div className="icon-badge" style={{background: 'rgba(29, 161, 242, 0.15)'}}><Twitter size={20} color="#1DA1F2" /></div>
              <h4 style={{ margin:0, color:'#fff' }}>Post on X</h4>
            </div>
            <p style={{ fontSize: '0.95rem', color:'var(--text-dim)', lineHeight: 1.6 }}>
              "I just found $400/year in wasted subscriptions using ForgetSubs! Check if you're leaking money here: [Your Link]"
            </p>
          </div>

          <div className="stat-card-glass" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '2rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'1rem' }}>
              <div className="icon-badge" style={{background: 'rgba(255, 0, 0, 0.15)'}}><Youtube size={20} color="#FF0000" /></div>
              <h4 style={{ margin:0, color:'#fff' }}>Create Videos</h4>
            </div>
            <p style={{ fontSize: '0.95rem', color:'var(--text-dim)', lineHeight: 1.6 }}>
              Record a 15s TikTok or Reel showing the "Money Leak" scanner finding subscriptions. These go viral easily.
            </p>
          </div>

          <div className="stat-card-glass" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '2rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'1rem' }}>
              <div className="icon-badge" style={{background: 'rgba(0, 255, 163, 0.15)'}}><TrendingUp size={20} color="#00ffa3" /></div>
              <h4 style={{ margin:0, color:'#fff' }}>Proof of Savings</h4>
            </div>
            <p style={{ fontSize: '0.95rem', color:'var(--text-dim)', lineHeight: 1.6 }}>
              Take a screenshot of your analysis showing "Annual Waste" (blur personal info). Visual proof drives high clicks.
            </p>
          </div>

        </div>
      </div>

      {/* --- LEADERBOARD BANNER (Restored & Styled) --- */}
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto 4rem', 
        background: 'linear-gradient(90deg, rgba(0,255,163,0.1) 0%, rgba(96,239,255,0.05) 100%)',
        border: '1px solid rgba(0, 255, 163, 0.3)',
        borderRadius: '24px',
        padding: '3rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 0 50px rgba(0, 255, 163, 0.05)'
      }}>
        <div style={{ position:'relative', zIndex:2 }}>
          <div style={{ 
            width: '60px', height:'60px', background:'rgba(255, 217, 61, 0.15)', 
            borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
            margin: '0 auto 1.5rem', border: '1px solid rgba(255, 217, 61, 0.3)'
          }}>
            <Award size={32} color="#ffd93d" />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom:'1rem', color:'#fff' }}>
            Stay in the Leaderboard
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem', maxWidth:'600px', margin:'0 auto', lineHeight: 1.6 }}>
            Top referrers aren't just earning USDC. You are qualifying for future 
            <span style={{ color: '#ffd93d', fontWeight:'bold' }}> Revenue Share, NFT Airdrops, and Merch</span>. 
            Keep your rank high to secure your spot.
          </p>
        </div>
      </div>

      {/* Leaderboard Table */}
      <h2 className="section-title">Leaderboard – Top 20</h2>
      <div className="table-wrapper-glass">
        <table className="modern-table">
          <thead>
            <tr><th>Rank</th><th>Wallet</th><th>Clicks</th><th>Successful</th><th>Earnings</th></tr>
          </thead>
          <tbody>
            {leaderboard.map((u, i) => (
              <tr key={u.address} className={u.address === address?.toLowerCase() ? 'highlight-row' : ''}>
                <td>
                   <span className={`rank-badge rank-${i+1}`}>{i + 1}</span>
                </td>
                <td className="wallet-font">
                  {u.address.slice(0, 6)}...{u.address.slice(-4)}
                  {u.address === address?.toLowerCase() && <span className="me-tag">YOU</span>}
                </td>
                <td>{u.clicks}</td>
                <td>{u.successful_refers}</td>
                <td className="earnings-col">${u.earnings.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}