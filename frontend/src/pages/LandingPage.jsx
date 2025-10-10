import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <span className="logo-text">Forum Builder</span>
            </div>
            <nav className="nav">
              <a href="#features">Features</a>
              <Link to="/pricing">Pricing</Link>
              <Link to="/login" className="btn btn-primary">Get Started</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Build Your Own Forum in Minutes</h1>
            <p>Create professional forums for your community without any technical knowledge. Start free, upgrade when you grow.</p>
            <div className="hero-actions">
              <Link to="/login" className="btn btn-primary btn-lg">Start Building Free</Link>
              <Link to="/pricing" className="btn btn-secondary btn-lg">View Pricing</Link>
            </div>
            <p className="hero-note">✓ No credit card required • ✓ Free tier includes 2,000 members</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <h2>Everything You Need</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🚀</div>
              <h3>Quick Setup</h3>
              <p>Create your forum in under 5 minutes. No coding or technical skills required.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎨</div>
              <h3>Customizable Themes</h3>
              <p>Choose from beautiful themes and customize with your brand colors and logo.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Member Management</h3>
              <p>Easy user management with roles, permissions, and moderation tools.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Analytics</h3>
              <p>Track engagement, popular topics, and member activity.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure & Reliable</h3>
              <p>Built on AWS infrastructure with 99.9% uptime guarantee.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Lightning Fast</h3>
              <p>Optimized for speed with global CDN delivery.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="pricing-teaser">
        <div className="container">
          <h2>Simple, Transparent Pricing</h2>
          <p>Start free and scale as you grow</p>
          <div className="pricing-preview">
            <div className="price-card">
              <h3>Free</h3>
              <div className="price">$0<span>/forever</span></div>
              <ul>
                <li>1 Forum</li>
                <li>2,000 Members</li>
                <li>Basic Themes</li>
                <li>Community Support</li>
              </ul>
              <Link to="/login" className="btn btn-secondary">Start Free</Link>
            </div>
            <div className="price-card featured">
              <div className="badge">Most Popular</div>
              <h3>Pro</h3>
              <div className="price">$49<span>/month</span></div>
              <ul>
                <li>5 Forums</li>
                <li>5,000 Members Each</li>
                <li>✨ Custom Domain</li>
                <li>✨ Remove Branding</li>
                <li>Priority Support</li>
              </ul>
              <Link to="/pricing" className="btn btn-primary">Go Pro - Save $51</Link>
            </div>
            <div className="price-card">
              <h3>Business</h3>
              <div className="price">$199<span>/month</span></div>
              <ul>
                <li>25 Forums</li>
                <li>25,000 Members Each</li>
                <li>SSO Integration</li>
                <li>Account Manager</li>
                <li>Data Migration</li>
              </ul>
              <Link to="/pricing" className="btn btn-secondary">Go Business</Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <h2>Ready to Build Your Community?</h2>
          <p>Join thousands of forum creators worldwide</p>
          <Link to="/login" className="btn btn-primary btn-lg">Get Started Free</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Forum Builder</h4>
              <p>Create professional forums without technical knowledge</p>
            </div>
            <div className="footer-section">
              <h4>Product</h4>
              <Link to="/pricing">Pricing</Link>
              <a href="#features">Features</a>
              <a href="https://forum.snapitsoftware.com">Support Forum</a>
            </div>
            <div className="footer-section">
              <h4>SnapIT Suite</h4>
              <a href="https://snapitsoftware.com">SnapIT Software</a>
              <a href="https://snapitforms.com">SnapIT Forms</a>
              <a href="https://snapitqr.com">SnapIT QR</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 SnapIT Software. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
