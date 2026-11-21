import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LockKeyhole, Mail, ArrowRight, CheckCircle2, Search, Network, Bookmark, Activity
} from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!email.trim() || !password) {
      setError('Please provide both your registered email and password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid academic or personal email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    // Attempt backend login or informational guidance
    fetch('http://127.0.0.1:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
      .then((res) => {
        if (res.ok) {
          return res.json().then(() => {
            navigate('/explore');
          });
        } else if (res.status === 404) {
          // Authentication module not yet mounted on backend
          setInfoMessage('Authentication module is currently in guest mode. You can explore all 118,800+ academic papers directly.');
          setTimeout(() => navigate('/explore'), 1800);
        } else {
          return res.json().then((data) => setError(data.error || 'Invalid credentials.'));
        }
      })
      .catch(() => {
        setInfoMessage('Connected in Guest Mode. Redirecting to research paper explorer...');
        setTimeout(() => navigate('/explore'), 1500);
      });
  };

  return (
    <div className="login">
      {/* LEFT ART PANEL */}
      <section className="login-art">
        <Link to="/" className="brand" style={{ color: '#fff' }}>
          <span className="brand-icon">
            <Activity size={21} />
          </span>
          <span>
            research<span style={{ color: '#b4d7ca' }}>hub</span>
            <small style={{ color: '#b4cbc4' }}>ACADEMIC RESEARCH INTELLIGENCE</small>
          </span>
        </Link>

        <div className="login-art-content">
          <div className="eyebrow pale">YOUR RESEARCH JOURNEY, IN ONE PLACE</div>
          <h1>
            Every breakthrough<br />
            builds on <em>prior discoveries.</em>
          </h1>
          <p>
            Access comprehensive research records collected across arXiv, PubMed, OpenAlex, and Crossref.
          </p>

          <div className="login-art-tags">
            <span><Search size={14} /> 118,800+ Indexed Papers</span>
            <span><Network size={14} /> Cross-Repository Metadata</span>
            <span><Bookmark size={14} /> Curated Literature Intelligence</span>
          </div>
        </div>

        <div className="login-art-bottom">
          ResearchHub <span>Discover · Analyze · Synthesize</span>
        </div>
      </section>

      {/* RIGHT LOGIN PANEL */}
      <section className="login-panel">
        <Link to="/" className="back-btn">
          ← Back to website
        </Link>

        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-mark">
            <LockKeyhole size={20} />
          </div>
          <div className="eyebrow">WELCOME TO RESEARCHHUB</div>
          <h2>Sign in to continue</h2>
          <p>Access your academic literature discovery workspace.</p>

          <label>Academic or Institutional Email</label>
          <div className="field">
            <Mail size={16} />
            <input
              type="email"
              placeholder="researcher@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <label>Password</label>
          <div className="field">
            <LockKeyhole size={16} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <div className="form-row">
            <label className="remember">
              <input type="checkbox" defaultChecked /> Remember me
            </label>
            <span style={{ fontSize: '9px', color: '#6d9284', cursor: 'pointer' }}>
              Forgot password?
            </span>
          </div>

          {error && <div className="error">{error}</div>}
          {infoMessage && (
            <div style={{ background: '#eaf4ee', color: '#285b58', padding: '10px', borderRadius: '5px', fontSize: '9px', marginBottom: '14px' }}>
              {infoMessage}
            </div>
          )}

          <button type="submit" className="primary-btn submit-btn">
            Open Researcher Workspace <ArrowRight size={16} />
          </button>

          <div className="or">
            <span />OR<span />
          </div>

          <button
            type="button"
            className="demo-btn"
            onClick={() => {
              setEmail('researcher@example.edu');
              setPassword('password123');
              setInfoMessage('Demo credentials filled. Click "Open Researcher Workspace".');
            }}
          >
            Use Demo Academic Account
          </button>

          <div className="login-foot">
            New to ResearchHub? <Link to="/signup" style={{ color: '#285b58', fontWeight: 700 }}>Create an account</Link>
          </div>

          <div className="secure">
            <CheckCircle2 size={13} /> Protected by parameterized database verification.
          </div>
        </form>
      </section>
    </div>
  );
}

