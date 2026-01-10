import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { 
  Copy, Wallet, CheckCircle2, X, Share2, Twitter, 
  Youtube, TrendingUp, Award, Zap 
} from 'lucide-react';
import { supabase } from './supabase';

const WithdrawModal = ({ onClose, earnings, onSubmit }) => {
  const { address } = useAccount();
  const [amount, setAmount] = useState(earnings.toFixed(2));
  const [token, setToken] = useState('USDC');
  const [chainId, setChainId] = useState('8453'); // default Base
  const [toAddress, setToAddress] = useState(address || '');

  const handleSubmit = () => {
    onSubmit({ amount: parseFloat(amount), token, chainId: parseInt(chainId), toAddress });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
        <h3>Withdraw Earnings</h3>
        <div style={{ margin: '1rem 0' }}>
          <label>Amount (max {earnings.toFixed(2)} USDC)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} max={earnings} step="0.01" />
        </div>
        <div>
          <label>Token</label>
          <select value={token} onChange={e => setToken(e.target.value)}>
            <option>USDC</option>
            <option>USDT</option>
          </select>
        </div>
        <div>
          <label>Chain ID</label>
          <select value={chainId} onChange={e => setChainId(e.target.value)}>
            <option value="143">Monad (143)</option>
            <option value="56">BSC (56)</option>
            <option value="8453">Base (8453)</option>
            <option value="1">Ethereum (1)</option>
          </select>
        </div>
        <div>
          <label>To Address</label>
          <input type="text" value={toAddress} onChange={e => setToAddress(e.target.value)} />
        </div>
        <button className="unlock-btn" onClick={handleSubmit} style={{ marginTop: '1rem' }}>Submit Request</button>
      </div>
    </div>
  );
};

const EarningsModal = ({ onClose, earnings, withdrawals, onWithdrawSubmit }) => {
  const [showWithdraw, setShowWithdraw] = useState(false);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>Earnings Details</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button className="unlock-btn" onClick={() => setShowWithdraw(true)} disabled={earnings === 0}>
            <Wallet size={18} /> Withdraw Earnings
          </button>
        </div>

        {showWithdraw && <WithdrawModal onClose={() => setShowWithdraw(false)} earnings={earnings} onSubmit={async (data) => {
          await onWithdrawSubmit(data);
          setShowWithdraw(false);
        }} />}

        <h2 className="section-title" style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Withdrawal History</h2>
        {withdrawals.length === 0 ? <p>No requests yet</p> : (
          <table className="modern-table">
            <thead><tr><th>Date</th><th>Amount</th><th>Token</th><th>Status</th></tr></thead>
            <tbody>
              {withdrawals.map(w => (
                <tr key={w.id}>
                  <td>{new Date(w.created_at).toLocaleDateString()}</td>
                  <td>{w.amount}</td>
                  <td>{w.token}</td>
                  <td>{w.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default function ReferPage() {
  const { address, isConnected } = useAccount();
  const [userData, setUserData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!address) return;

    const loadUser = async () => {
      let { data } = await supabase.from('users').select('*').eq('address', address.toLowerCase()).single();
      if (!data) {
        let code;
        do {
          code = Math.random().toString(36).substring(2, 10).toUpperCase();
          const { data: existing } = await supabase.from('users').select('id').eq('referral_code', code).single();
          if (!existing) break;
        } while (true);
        await supabase.from('users').insert({ address: address.toLowerCase(), referral_code: code });
        const { data: newData } = await supabase.from('users').select('*').eq('address', address.toLowerCase()).single();
        data = newData;
      }
      setUserData(data);
    };
    loadUser();

    const channel = supabase.channel('user').on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `address=eq.${address.toLowerCase()}` }, payload => {
      setUserData(payload.new);
    }).subscribe();
    return () => supabase.removeChannel(channel);
  }, [address]);

  useEffect(() => {
    const loadLeaderboard = async () => {
      const { data } = await supabase.from('users').select('address,clicks,successful_refers,earnings').order('successful_refers', { ascending: false }).limit(20);
      setLeaderboard(data || []);
    };
    loadLeaderboard();
    const channel = supabase.channel('leaderboard').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => loadLeaderboard()).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (!address) return;
    const loadHistory = async () => {
      const { data } = await supabase.from('withdrawals').select('*').eq('user_address', address.toLowerCase()).order('created_at', { ascending: false });
      setWithdrawals(data || []);
    };
    loadHistory();
  }, [address]);

  if (!isConnected) return <div className="container" style={{paddingTop: '6rem', textAlign:'center'}}><h2>Connect wallet to view referral dashboard</h2></div>;
  if (!userData) return <div className="container" style={{paddingTop: '6rem', textAlign:'center'}}>Loading...</div>;

  const link = `https://forgetsubs.com/?ref=${userData.referral_code}`;

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container" style={{ padding: '4rem 1.5rem' }}>
      
      {/* Header Section */}
      <h1 className="section-title">Refer & <span style={{color:'var(--primary)'}}>Earn</span></h1>
      <p style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '1.1rem', color: 'var(--text-dim)' }}>
        Earn <strong>1.5 USDC</strong> instantly for every friend who unlocks their report.
      </p>

      {/* Link & Stats */}
      <div style={{ maxWidth: '600px', margin: '0 auto 3rem' }}>
        <label>Your Unique Link</label>
        <div className="copy-box">
          <input type="text" readOnly value={link} />
          <button onClick={copyLink}>{copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}</button>
        </div>
      </div>

      <div className="refer-stats" style={{ maxWidth: '700px', margin: '0 auto 4rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-mini"><span>Total Clicks</span><strong>{userData.clicks}</strong></div>
        <div className="stat-mini"><span>Successful Refers</span><strong>{userData.successful_refers}</strong></div>
        <div className="stat-mini" style={{ cursor: 'pointer', border: '1px solid var(--primary)' }} onClick={() => setShowEarningsModal(true)}>
          <span>Total Earnings</span><strong className="green">{userData.earnings.toFixed(2)} USDC</strong>
        </div>
      </div>

      {showEarningsModal && <EarningsModal 
        onClose={() => setShowEarningsModal(false)} 
        earnings={userData.earnings} 
        withdrawals={withdrawals} 
        onWithdrawSubmit={async (data) => {
          await supabase.from('withdrawals').insert({ user_address: address.toLowerCase(), ...data });
        }} 
      />}

      {/* How It Works Steps */}
      <div style={{ maxWidth: '800px', margin: '0 auto 5rem' }}>
        <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>How It Works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div className="trust-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ background: 'rgba(0,255,163,0.1)', width: '40px', height: '40px', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem', color:'var(--primary)', fontWeight:'bold' }}>1</div>
            <h4 style={{fontSize: '1rem'}}>Share Link</h4>
            <p style={{fontSize: '0.9rem'}}>Copy your unique link and share it on socials with Proper post.</p>
          </div>
          <div className="trust-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ background: 'rgba(0,255,163,0.1)', width: '40px', height: '40px', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem', color:'var(--primary)', fontWeight:'bold' }}>2</div>
            <h4 style={{fontSize: '1rem'}}>Friend Unlocks</h4>
            <p style={{fontSize: '0.9rem'}}>User click your refer link and join, Use Function then he/she pay for the Detailed report to unlock.</p>
          </div>
          <div className="trust-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ background: 'rgba(0,255,163,0.1)', width: '40px', height: '40px', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem', color:'var(--primary)', fontWeight:'bold' }}>3</div>
            <h4 style={{fontSize: '1rem'}}>You Earn</h4>
            <p style={{fontSize: '0.9rem'}}>You Get 1.5 USDC instantly, Which added to Total Earnings .click & Withdraw to any chain.</p>
          </div>
        </div>
      </div>

      {/* Boost Earnings Section */}
      <div style={{ maxWidth: '900px', margin: '0 auto 5rem' }}>
        <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>🚀 How to Earn More</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          
          <div className="stat-card" style={{ padding: '1.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'1rem' }}>
              <Twitter color="#1DA1F2" /> 
              <h4 style={{ margin:0, color:'#fff' }}>Post on X</h4>
            </div>
            <p style={{ fontSize: '0.9rem', color:'var(--text-dim)' }}>
              "I just found $400/year in wasted subscriptions using ForgetSubs! Check if you're leaking money here: [Your Link]"
            </p>
          </div>

          <div className="stat-card" style={{ padding: '1.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'1rem' }}>
              <Youtube color="#FF0000" /> 
              <h4 style={{ margin:0, color:'#fff' }}>Create Videos</h4>
            </div>
            <p style={{ fontSize: '0.9rem', color:'var(--text-dim)' }}>
              Record a 15s TikTok or Reel showing the "Money Leak" scanner finding subscriptions. These go viral easily.
            </p>
          </div>

          <div className="stat-card" style={{ padding: '1.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'1rem' }}>
              <TrendingUp color="#00ffa3" /> 
              <h4 style={{ margin:0, color:'#fff' }}>Proof of Savings</h4>
            </div>
            <p style={{ fontSize: '0.9rem', color:'var(--text-dim)' }}>
              Take a screenshot of your analysis showing "Annual Waste" (blur personal info). Visual proof drives high clicks.
            </p>
          </div>

        </div>
      </div>

      {/* Leaderboard Reward Banner */}
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto 3rem', 
        background: 'linear-gradient(90deg, rgba(0,255,163,0.15) 0%, rgba(96,239,255,0.05) 100%)',
        border: '1px solid var(--primary)',
        borderRadius: '16px',
        padding: '2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position:'relative', zIndex:2 }}>
          <Award size={48} color="#ffd93d" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom:'0.5rem', color:'#fff' }}>
            Stay in the Leaderboard
          </h2>
          <p style={{ color: '#fff', fontSize: '1.1rem', maxWidth:'600px', margin:'0 auto' }}>
            Top referrers aren't just earning USDC. You are qualifying for future 
            <span style={{ color: '#ffd93d', fontWeight:'bold' }}> Revenue Share Airdrops</span>. 
            Keep your rank high to secure your spot.
          </p>
        </div>
      </div>

      {/* Leaderboard Table */}
      <h2 className="section-title" style={{ marginTop: '2rem' }}>Leaderboard – Top 20</h2>
      <div className="table-responsive" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <table className="modern-table">
          <thead>
            <tr><th>Rank</th><th>Wallet</th><th>Clicks</th><th>Successful</th><th>Earnings</th></tr>
          </thead>
          <tbody>
            {leaderboard.map((u, i) => (
              <tr key={u.address} style={u.address === address?.toLowerCase() ? { background: 'rgba(0,255,163,0.1)' } : {}}>
                <td>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </td>
                <td>
                  {u.address.slice(0, 6)}...{u.address.slice(-4)}
                  {u.address === address?.toLowerCase() && <span style={{marginLeft:'8px', fontSize:'0.7rem', background:'var(--primary)', color:'#000', padding:'2px 6px', borderRadius:'4px'}}>YOU</span>}
                </td>
                <td>{u.clicks}</td>
                <td>{u.successful_refers}</td>
                <td style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{u.earnings.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}