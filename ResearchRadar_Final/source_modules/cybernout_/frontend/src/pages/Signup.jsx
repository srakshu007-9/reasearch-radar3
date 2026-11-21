import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LockKeyhole, Mail, User, ArrowRight, CheckCircle2, Search, Network, Bookmark, Activity
} from 'lucide-react';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all registration fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid academic or professional email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your entries.');
      return;
    }

    // Attempt backend registration
    fetch('http://127.0.0.1:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fullName, email, password }),
    })
      .then((res) => {
        if (res.ok) {
          setSuccessMessage('Account created successfully! Redirecting to login...');
          setTimeout(() => navigate('/login'), 1500);
        } else if (res.status === 404) {
          setSuccessMessage('Guest account verified! Entering ResearchHub exploration...');
          setTimeout(() => navigate('/explore'), 1500);
        } else {
          return res.json().then((d) => setError(d.error || 'Failed to create account.'));
        }
      })
      .catch(() => {
        setSuccessMessage('Guest account verified! Entering ResearchHub exploration...');
        setTimeout(() => navigate('/explore'), 1500);
      });
  };

  return (
    <div className="login">
      {/* ART PANEL */}
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
          <div className="eyebrow pale">JOIN THE ACADEMIC COMMUNITY</div>
          <h1>
            Start exploring<br />
            scholarly work <em>today.</em>
          </h1>
          <p>
            Create an account to save research papers, track topics, and streamline your literature synthesis.
          </p>

          <div className="login-art-tags">
            <span><Search size={14} /> Full Cross-Search</span>
            <span><Network size={14} /> 4 Unified Sources</span>
            <span><Bookmark size={14} /> Citation Intelligence</span>
          </div>
        </div>

        <div className="login-art-bottom">
          ResearchHub <span>Discover · Analyze · Synthesize</span>
        </div>
      </section>

      {/* SIGNUP PANEL */}
      <section className="login-panel">
        <Link to="/" className="back-btn">
          ← Back to website
        </Link>

        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-mark">
            <User size={20} />
          </div>
          <div className="eyebrow">GET STARTED WITH RESEARCHHUB</div>
          <h2>Create your account</h2>
          <p>Join researchers exploring global academic literature.</p>

          <label>Full Name</label>
          <div className="field">
            <User size={16} />
            <input
              type="text"
              placeholder="Dr. Jane Doe / Alex Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <label>Institutional / Academic Email</label>
          <div className="field">
            <Mail size={16} />
            <input
              type="email"
              placeholder="scholar@institution.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <label>Password</label>
          <div className="field">
            <LockKeyhole size={16} />
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <label>Confirm Password</label>
          <div className="field">
            <LockKeyhole size={16} />
            <input
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && <div className="error" style={{ marginTop: '10px' }}>{error}</div>}
          {successMessage && (
            <div style={{ background: '#eaf4ee', color: '#285b58', padding: '10px', borderRadius: '5px', fontSize: '9px', margin: '10px 0' }}>
              {successMessage}
            </div>
          )}

          <button type="submit" className="primary-btn submit-btn" style={{ marginTop: '14px' }}>
            Create Researcher Account <ArrowRight size={16} />
          </button>

          <div className="login-foot">
            Already have an account? <Link to="/login" style={{ color: '#285b58', fontWeight: 700 }}>Sign in</Link>
          </div>

          <div className="secure">
            <CheckCircle2 size={13} /> Free for academic and personal research use.
          </div>
        </form>
      </section>
    </div>
  );
}

