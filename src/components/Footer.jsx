import React from 'react';
import './Footer.css';

const Footer = () => {
  const handleNavClick = (e, hash) => {
    e.preventDefault();
    if (hash !== undefined) {
      window.location.hash = hash;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="cinescope-footer">
      <div className="footer-wrapper">
        {/* Main 5-Column Content Grid */}
        <div className="footer-grid">
          {/* Column 1: Brand & About */}
          <div className="footer-col footer-col-brand">
            <a href="#" onClick={(e) => handleNavClick(e, '')} className="footer-logo">
              <span className="logo-cine">Cine</span>
              <span className="logo-scope">Scope</span>
            </a>
            <p className="footer-tagline">Discover Your Next Favourite</p>
            <p className="footer-about">
              An intelligent media discovery platform powered by TMDB, AI reasoning, and real-time social movie matching.
            </p>
          </div>

          {/* Column 2: Navigation Links */}
          <div className="footer-col">
            <h4 className="footer-heading">Explore</h4>
            <ul className="footer-links">
              <li><a href="#" onClick={(e) => handleNavClick(e, '')}>Home</a></li>
              <li><a href="#discover/movies" onClick={(e) => handleNavClick(e, '#discover/movies')}>Movies Catalog</a></li>
              <li><a href="#discover/tv" onClick={(e) => handleNavClick(e, '#discover/tv')}>TV Series</a></li>
              <li><a href="#discover/trending" onClick={(e) => handleNavClick(e, '#discover/trending')}>Trending Now</a></li>
            </ul>
          </div>

          {/* Column 3: CineAI Tools */}
          <div className="footer-col">
            <h4 className="footer-heading">CineAI Suite</h4>
            <ul className="footer-links">
              <li><a href="#cineai-tool/what-to-watch" onClick={(e) => handleNavClick(e, '#cineai-tool/what-to-watch')}>What Should I Watch?</a></li>
              <li><a href="#cineai-tool/planner" onClick={(e) => handleNavClick(e, '#cineai-tool/planner')}>Movie Night Planner</a></li>
              <li><a href="#cineai-tool/pick-for-me" onClick={(e) => handleNavClick(e, '#cineai-tool/pick-for-me')}>Pick For Me</a></li>
              <li><a href="#cineai-tool/debate" onClick={(e) => handleNavClick(e, '#cineai-tool/debate')}>Movie Debate AI</a></li>
            </ul>
          </div>

          {/* Column 4: Team Code-Blooded */}
          <div className="footer-col">
            <h4 className="footer-heading">Team Code-Blooded</h4>
            <ul className="footer-members-list">
              <li><span className="member-bullet">▸</span> <span className="member-label">Atif</span></li>
              <li><span className="member-bullet">▸</span> <span className="member-label">Asif</span></li>
              <li><span className="member-bullet">▸</span> <span className="member-label">Swastik</span></li>
            </ul>
          </div>

          {/* Column 5: Built For VibeForge 1.0 Rectangular Box */}
          <div className="footer-col footer-col-event">
            <div className="vibeforge-box">
              <span className="vibeforge-prefix">Built For</span>
              <span className="vibeforge-title">VibeForge 1.0</span>
            </div>
          </div>
        </div>

        {/* Horizontal Divider Line */}
        <div className="footer-divider" />

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <p className="footer-copyright">
            © 2026 <strong>CineScope</strong> · <strong>Team Code-Blooded</strong> · <strong>VibeForge 1.0</strong>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
