import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Pricing.css';

export default function Pricing() {
  const { user, token, API_URL } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);

  const plans = [
    {
      tier: 'free',
      name: 'Free',
      price: 0,
      period: 'forever',
      description: 'Perfect for trying out the platform',
      features: [
        '1 Forum',
        '500 Members',
        'Basic Themes',
        'Community Support',
        'Mobile Responsive',
        'Basic Analytics'
      ],
      cta: 'Get Started Free',
      popular: false
    },
    {
      tier: 'starter',
      name: 'Starter',
      price: 19,
      period: 'month',
      description: 'For small communities',
      features: [
        '2 Forums',
        '2,000 Members Each',
        'Premium Themes',
        'Email Support',
        'Custom CSS',
        'Advanced Analytics'
      ],
      cta: 'Start Growing',
      popular: false
    },
    {
      tier: 'pro',
      name: 'Pro',
      price: 49,
      period: 'month',
      description: 'Best for growing communities',
      features: [
        '5 Forums',
        '5,000 Members Each',
        'All Starter Features',
        'Custom Domain',
        'Priority Support',
        'Remove Branding',
        'SSL Included',
        '99.9% Uptime SLA'
      ],
      cta: 'Go Pro',
      popular: true
    },
    {
      tier: 'growth',
      name: 'Growth',
      price: 99,
      period: 'month',
      description: 'For scaling businesses',
      features: [
        '10 Forums',
        '10,000 Members Each',
        'All Pro Features',
        'API Access',
        'White-Label Options',
        'Dedicated Support',
        'Custom Integrations',
        'Monthly Check-ins'
      ],
      cta: 'Scale Up',
      popular: false
    },
    {
      tier: 'business',
      name: 'Business',
      price: 199,
      period: 'month',
      description: 'For professional communities',
      features: [
        '25 Forums',
        '25,000 Members Each',
        'All Growth Features',
        'SSO Integration',
        'Account Manager',
        'Advanced Security',
        'Data Migration',
        'Implementation Support'
      ],
      cta: 'Go Business',
      popular: false
    },
    {
      tier: 'enterprise',
      name: 'Enterprise',
      price: 499,
      period: 'month',
      description: 'Unlimited scale and customization',
      features: [
        'Unlimited Forums',
        'Unlimited Members',
        'All Business Features',
        'Custom Development',
        '24/7 Phone Support',
        'On-Premise Option',
        'Custom SLA',
        'Dedicated DevOps'
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ];

  const handleUpgrade = async (tier) => {
    if (tier === 'free') {
      navigate('/login');
      return;
    }

    if (tier === 'enterprise') {
      window.location.href = 'mailto:snapitsoft@gmail.com?subject=Enterprise Plan Inquiry';
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(tier);

    try {
      const response = await fetch(`${API_URL}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tier })
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout');
        setLoading(null);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Network error. Please try again.');
      setLoading(null);
    }
  };

  const userTier = user?.subscriptionTier || 'free';

  return (
    <div className="pricing-page">
      {/* Header */}
      <header className="pricing-header">
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <Link to="/" className="logo-text">Forum Builder</Link>
            </div>
            <nav className="nav">
              <Link to="/#features">Features</Link>
              <Link to="/pricing">Pricing</Link>
              {user ? (
                <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
              ) : (
                <Link to="/login" className="btn btn-primary">Get Started</Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pricing-hero">
        <div className="container">
          <h1>Choose Your Plan</h1>
          <p>Start free and scale as you grow. No hidden fees, cancel anytime.</p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pricing-section">
        <div className="container">
          <div className="pricing-grid">
            {plans.map(plan => (
              <div
                key={plan.tier}
                className={`pricing-card ${plan.popular ? 'popular' : ''} ${userTier === plan.tier ? 'current' : ''}`}
              >
                {plan.popular && <div className="badge">Most Popular</div>}
                {userTier === plan.tier && <div className="badge current-badge">Current Plan</div>}

                <div className="card-header">
                  <h3>{plan.name}</h3>
                  <div className="price">
                    <span className="amount">${plan.price}</span>
                    <span className="period">/{plan.period}</span>
                  </div>
                  <p className="plan-description">{plan.description}</p>
                </div>

                <ul className="features-list">
                  {plan.features.map((feature, index) => (
                    <li key={index}>
                      <span className="check">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.tier)}
                  className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'} btn-block`}
                  disabled={loading === plan.tier || (userTier === plan.tier && plan.tier !== 'free')}
                >
                  {loading === plan.tier ? (
                    'Processing...'
                  ) : userTier === plan.tier && plan.tier !== 'free' ? (
                    'Current Plan'
                  ) : (
                    plan.cta
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="container">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h3>Can I change plans anytime?</h3>
              <p>Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any differences.</p>
            </div>
            <div className="faq-item">
              <h3>What happens if I exceed my member limit?</h3>
              <p>We'll notify you when you're approaching your limit. You can upgrade to a higher tier or remove inactive members.</p>
            </div>
            <div className="faq-item">
              <h3>Do you offer refunds?</h3>
              <p>We offer a 30-day money-back guarantee on all paid plans. If you're not satisfied, we'll refund your payment in full.</p>
            </div>
            <div className="faq-item">
              <h3>Is my data secure?</h3>
              <p>Absolutely. We use enterprise-grade encryption and host on AWS infrastructure with 99.9% uptime guarantee.</p>
            </div>
            <div className="faq-item">
              <h3>Can I use my own domain?</h3>
              <p>Yes! Pro and higher plans include custom domain support. We'll help you set it up.</p>
            </div>
            <div className="faq-item">
              <h3>What payment methods do you accept?</h3>
              <p>We accept all major credit cards via Stripe. Enterprise plans can also pay via invoice.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pricing-cta">
        <div className="container">
          <h2>Ready to Build Your Community?</h2>
          <p>Join thousands of forum creators worldwide</p>
          <Link to="/login" className="btn btn-primary btn-lg">Start Free Today</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="pricing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Forum Builder</h4>
              <p>Create professional forums without technical knowledge</p>
            </div>
            <div className="footer-section">
              <h4>Product</h4>
              <Link to="/pricing">Pricing</Link>
              <Link to="/#features">Features</Link>
              <a href="https://forum.snapitsoftware.com">Support</a>
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
