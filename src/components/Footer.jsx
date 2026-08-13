import React from 'react';
import './Footer.css';

const Footer = () => {
  const handleNavClick = (e, hash) => {
    e.preventDefault();
    window.location.hash = hash;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="cinescope-footer">
      <div className="footer-container">
        {/* Main Footer Content */}
        <div className="footer-grid">
          {/* Column 1: Brand */}
          <div className="footer-col footer-col-brand">
            <a href="#" onClick={(e) => handleNavClick(e, '')} className="footer-logo">
              <span className="logo-cine">Cine</span>
              <span className="logo-scope">Scope</span>
            </a>
            <p className="footer-tagline">Discover Your Next Favourite</p>
            <p className="footer-description">
              An intelligent media discovery platform bringing movies, TV shows, and AI recommendations together.
            </p>
          </div>

          {/* Column 2: Navigation */}
          <div className="footer-col footer-col-nav">
            <h4 className="footer-heading">Navigation</h4>
            <ul className="footer-links">
              <li><a href="#" onClick={(e) => handleNavClick(e, '')}>Home</a></li>
              <li><a href="#discover/movies" onClick={(e) => handleNavClick(e, '#discover/movies')}>Movies</a></li>
              <li><a href="#discover/tv" onClick={(e) => handleNavClick(e, '#discover/tv')}>TV Shows</a></li>
              <li><a href="#cineai" onClick={(e) => handleNavClick(e, '#cineai')}>CineAI</a></li>
              <li><a href="#social" onClick={(e) => handleNavClick(e, '#social')}>Social Match</a></li>
            </ul>
          </div>

          {/* Column 3: Team & Hackathon Info */}
          <div className="footer-col footer-col-team">
            <h4 className="footer-heading">Team & Hackathon</h4>
            <div className="footer-team-info">
              <p className="footer-team-name">Built by Team <strong>Code-Blooded</strong></p>
              <div className="footer-members-list">
                <span className="member-name">Atif</span>
                <span className="member-sep">·</span>
                <span className="member-name">Asif</span>
                <span className="member-sep">·</span>
                <span className="member-name">Swastik</span>
              </div>
              <p className="footer-hackathon-tag">
                Built for <span className="hackathon-name">VibeForge 1.0</span> · 2026
              </p>
            </div>
          </div>
        </div>

        {/* Accent Glow Divider */}
        <div className="footer-divider" />

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <p className="footer-copyright">
            © 2026 <span className="brand-accent">CineScope</span>. All rights reserved.
          </p>
          <p className="footer-credit">
            Crafted for <strong>VibeForge 1.0</strong> by <strong>Team Code-Blooded</strong>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
