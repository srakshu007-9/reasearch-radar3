import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Activity, Menu, X, ArrowUpRight } from 'lucide-react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-icon">
          <Activity size={21} />
        </span>
        <span>
          research<span>hub</span>
          <small style={{ display: 'block', fontSize: '7px', letterSpacing: '1.35px', color: '#8da5a0', marginTop: '2px', fontWeight: 700 }}>
            ACADEMIC RESEARCH INTELLIGENCE
          </small>
        </span>
      </Link>

      <nav className="navbar-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Home
        </NavLink>
        <NavLink to="/explore" className={({ isActive }) => (isActive ? 'active' : '')}>
          Explore Papers
        </NavLink>
        <a href="#how" onClick={(e) => {
          if (window.location.pathname !== '/') {
            e.preventDefault();
            navigate('/#how');
          }
        }}>
          How it works
        </a>
      </nav>

      <div className="navbar-actions">
        <Link to="/login" className="nav-login-btn">
          Log in
        </Link>
        <Link to="/signup" className="nav-signup-btn">
          Sign Up <ArrowUpRight size={13} style={{ marginLeft: '4px' }} />
        </Link>
      </div>

      <button
        className="navbar-hamburger"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      <div className={`navbar-mobile-menu ${mobileOpen ? 'open' : ''}`}>
        <Link to="/" onClick={() => setMobileOpen(false)}>Home</Link>
        <Link to="/explore" onClick={() => setMobileOpen(false)}>Explore Papers</Link>
        <Link to="/login" onClick={() => setMobileOpen(false)}>Log in</Link>
        <Link to="/signup" onClick={() => setMobileOpen(false)} style={{ color: '#285b58', fontWeight: 700 }}>Sign Up</Link>
      </div>
    </header>
  );
}

