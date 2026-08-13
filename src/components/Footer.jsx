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
            <h4 className="footer-heading">Built by Team Code-Blooded</h4>
            <ul className="footer-members-list">
              <li><span className="member-bullet">▸</span> <span className="member-label">Atif</span></li>
              <li><span className="member-bullet">▸</span> <span className="member-label">Asif</span></li>
              <li><span className="member-bullet">▸</span> <span className="member-label">Swastik</span></li>
            </ul>
          </div>

          {/* Column 5: Hackathon Event Details */}
          <div className="footer-col">
            <h4 className="footer-heading">Hackathon</h4>
            <div className="footer-event-box">
              <p className="event-built-for">Built for</p>
              <p className="event-name">VibeForge 1.0</p>
              <p className="event-year">2026</p>
            </div>
          </div>
        </div>

        {/* Horizontal Divider Line */}
        <div className="footer-divider" />

        {/* Bottom Bar matching Reference Format */}
        <div className="footer-bottom-bar">
          <div className="footer-bottom-links">
            <a href="#" onClick={(e) => handleNavClick(e, '')}>CineScope</a>
            <span className="bar-sep">|</span>
            <a href="#discover/movies" onClick={(e) => handleNavClick(e, '#discover/movies')}>Browse Movies</a>
            <span className="bar-sep">|</span>
            <a href="#cineai" onClick={(e) => handleNavClick(e, '#cineai')}>CineAI Intelligence</a>
            <span className="bar-sep">|</span>
            <a href="#social" onClick={(e) => handleNavClick(e, '#social')}>Social Movie Match</a>
          </div>
          <p className="footer-copyright">
            © 2026 <strong>CineScope</strong>. Built by <strong>Team Code-Blooded</strong> for <strong>VibeForge 1.0</strong>. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
