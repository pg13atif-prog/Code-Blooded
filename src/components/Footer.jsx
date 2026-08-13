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
        {/* Top Section */}
        <div className="footer-top">
          {/* Brand Column */}
          <div className="footer-brand-col">
            <a href="#" onClick={(e) => handleNavClick(e, '')} className="footer-logo">
              <span className="logo-cine">Cine</span>
              <span className="logo-scope">Scope</span>
            </a>
            <p className="footer-tagline">Discover Your Next Favourite</p>
          </div>

          {/* Quick Navigation Column */}
          <div className="footer-nav-col">
            <h4 className="footer-col-title">Navigation</h4>
            <ul className="footer-links">
              <li><a href="#" onClick={(e) => handleNavClick(e, '')}>Home</a></li>
              <li><a href="#discover/movies" onClick={(e) => handleNavClick(e, '#discover/movies')}>Movies</a></li>
              <li><a href="#discover/tv" onClick={(e) => handleNavClick(e, '#discover/tv')}>TV Shows</a></li>
              <li><a href="#cineai" onClick={(e) => handleNavClick(e, '#cineai')}>CineAI</a></li>
              <li><a href="#social" onClick={(e) => handleNavClick(e, '#social')}>Social</a></li>
            </ul>
          </div>

          {/* Team Column */}
          <div className="footer-team-col">
            <h4 className="footer-col-title">Built by Team Code-Blooded</h4>
            <div className="footer-team-members">
              <span className="team-member">Atif</span>
              <span className="member-dot">·</span>
              <span className="team-member">Asif</span>
              <span className="member-dot">·</span>
              <span className="team-member">Swastik</span>
            </div>
            <p className="footer-event-info">
              Built for <span className="event-highlight">VibeForge 1.0</span> · 2026
            </p>
          </div>
        </div>

        {/* Accent Glow Line Divider */}
        <div className="footer-divider" />

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            © 2026 <span className="copyright-brand">CineScope</span>. All rights reserved.
          </p>
          <p className="footer-hackathon-credit">
            Crafted with ♥ for <strong>VibeForge 1.0</strong> by <strong>Team Code-Blooded</strong>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
