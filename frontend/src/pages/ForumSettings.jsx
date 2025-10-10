import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ForumSettings.css';

export default function ForumSettings() {
  const { forumId } = useParams();
  const { user, token, API_URL } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('general');
  const [forum, setForum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Forum settings state
  const [settings, setSettings] = useState({
    name: '',
    description: '',
    subdomain: '',
    tagline: '',
    logo: '',
    timezone: 'America/New_York',
    language: 'en',
    allowRegistration: true,
    // Theme settings
    primaryColor: '#EC008C',
    secondaryColor: '#FFFEF5',
    accentColor: '#C4006F',
    fontFamily: 'Inter, sans-serif',
    removeBranding: false,
    customCSS: '',
    // Custom domain
    customDomain: '',
    customDomainStatus: 'not_configured'
  });

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchForumSettings();
  }, [forumId]);

  const fetchForumSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/forums/${forumId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setForum(data);
        setSettings({
          name: data.name || '',
          description: data.description || '',
          subdomain: data.subdomain || '',
          tagline: data.tagline || '',
          logo: data.logo || '',
          timezone: data.timezone || 'America/New_York',
          language: data.language || 'en',
          allowRegistration: data.allowRegistration !== false,
          primaryColor: data.theme?.primaryColor || '#EC008C',
          secondaryColor: data.theme?.secondaryColor || '#FFFEF5',
          accentColor: data.theme?.accentColor || '#C4006F',
          fontFamily: data.theme?.fontFamily || 'Inter, sans-serif',
          removeBranding: data.theme?.removeBranding || false,
          customCSS: data.theme?.customCSS || '',
          customDomain: data.customDomain || '',
          customDomainStatus: data.customDomainStatus || 'not_configured'
        });
      }
    } catch (error) {
      console.error('Failed to fetch forum settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/forums/${forumId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        alert('Settings saved successfully!');
        fetchForumSettings();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save settings');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading forum settings...</p>
      </div>
    );
  }

  const userTier = user?.subscriptionTier || 'free';
  const canCustomize = ['pro', 'growth', 'business', 'enterprise'].includes(userTier);
  const canUseCustomDomain = canCustomize;
  const canRemoveBranding = canCustomize;
  const canUseCustomCSS = ['growth', 'business', 'enterprise'].includes(userTier);

  return (
    <div className="forum-settings-page">
      {/* Header */}
      <header className="settings-header">
        <div className="container">
          <div className="header-content">
            <div>
              <button onClick={() => navigate('/dashboard')} className="back-btn">
                ← Back to Dashboard
              </button>
              <h1>{forum?.name || 'Forum'} Settings</h1>
              <p className="forum-url">
                {settings.customDomain || `${settings.subdomain}.forums.snapitsoftware.com`}
              </p>
            </div>
            <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </header>

      <div className="settings-container">
        <div className="container">
          <div className="settings-layout">
            {/* Sidebar Navigation */}
            <nav className="settings-nav">
              <button
                className={`nav-item ${activeTab === 'general' ? 'active' : ''}`}
                onClick={() => setActiveTab('general')}
              >
                ⚙️ General
              </button>
              <button
                className={`nav-item ${activeTab === 'appearance' ? 'active' : ''}`}
                onClick={() => setActiveTab('appearance')}
              >
                🎨 Appearance
              </button>
              <button
                className={`nav-item ${activeTab === 'categories' ? 'active' : ''}`}
                onClick={() => setActiveTab('categories')}
              >
                📁 Categories
              </button>
              <button
                className={`nav-item ${activeTab === 'members' ? 'active' : ''}`}
                onClick={() => setActiveTab('members')}
              >
                👥 Members
              </button>
              <button
                className={`nav-item ${activeTab === 'domain' ? 'active' : ''}`}
                onClick={() => setActiveTab('domain')}
              >
                🌐 Custom Domain
              </button>
              <button
                className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                📊 Analytics
              </button>
            </nav>

            {/* Content Area */}
            <div className="settings-content">
              {/* General Settings */}
              {activeTab === 'general' && (
                <div className="settings-section">
                  <h2>General Settings</h2>
                  <p className="section-description">Basic information about your forum</p>

                  <div className="form-group">
                    <label>Forum Name *</label>
                    <input
                      type="text"
                      value={settings.name}
                      onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                      placeholder="My Awesome Forum"
                    />
                  </div>

                  <div className="form-group">
                    <label>Tagline</label>
                    <input
                      type="text"
                      value={settings.tagline}
                      onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                      placeholder="A community for..."
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={settings.description}
                      onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                      placeholder="Describe your forum"
                      rows={4}
                    />
                  </div>

                  <div className="form-group">
                    <label>Subdomain</label>
                    <div className="subdomain-display">
                      <code>{settings.subdomain}.forums.snapitsoftware.com</code>
                      <small>Contact support to change your subdomain</small>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Timezone</label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                      >
                        <option value="America/New_York">Eastern Time (US)</option>
                        <option value="America/Chicago">Central Time (US)</option>
                        <option value="America/Denver">Mountain Time (US)</option>
                        <option value="America/Los_Angeles">Pacific Time (US)</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Europe/Paris">Paris (CET)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Language</label>
                      <select
                        value={settings.language}
                        onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={settings.allowRegistration}
                        onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                      />
                      Allow new user registration
                    </label>
                  </div>
                </div>
              )}

              {/* Appearance Settings */}
              {activeTab === 'appearance' && (
                <div className="settings-section">
                  <h2>Appearance & Branding</h2>
                  {!canCustomize && (
                    <div className="upgrade-notice">
                      <p>⭐ Upgrade to Pro or higher to customize your forum's appearance and remove branding</p>
                      <button onClick={() => navigate('/pricing')} className="btn btn-primary">
                        Upgrade Now
                      </button>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Primary Color</label>
                    <div className="color-picker">
                      <input
                        type="color"
                        value={settings.primaryColor}
                        onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                        disabled={!canCustomize}
                      />
                      <input
                        type="text"
                        value={settings.primaryColor}
                        onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                        disabled={!canCustomize}
                        className="color-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Font Family</label>
                    <select
                      value={settings.fontFamily}
                      onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}
                      disabled={!canCustomize}
                    >
                      <option value="Inter, sans-serif">Inter</option>
                      <option value="Roboto, sans-serif">Roboto</option>
                      <option value="Open Sans, sans-serif">Open Sans</option>
                      <option value="Lato, sans-serif">Lato</option>
                      <option value="Georgia, serif">Georgia</option>
                    </select>
                  </div>

                  {canRemoveBranding && (
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={settings.removeBranding}
                          onChange={(e) => setSettings({ ...settings, removeBranding: e.target.checked })}
                        />
                        Remove "Powered by SnapIT" branding
                      </label>
                    </div>
                  )}

                  {canUseCustomCSS && (
                    <div className="form-group">
                      <label>Custom CSS (Advanced)</label>
                      <textarea
                        value={settings.customCSS}
                        onChange={(e) => setSettings({ ...settings, customCSS: e.target.value })}
                        placeholder="/* Your custom CSS here */"
                        rows={10}
                        className="code-editor"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Categories */}
              {activeTab === 'categories' && (
                <div className="settings-section">
                  <h2>Categories</h2>
                  <p className="section-description">Organize your forum into categories</p>
                  <button className="btn btn-primary">+ Add Category</button>
                  <div className="placeholder-content">
                    <p>Category management coming soon...</p>
                  </div>
                </div>
              )}

              {/* Members */}
              {activeTab === 'members' && (
                <div className="settings-section">
                  <h2>Member Management</h2>
                  <p className="section-description">Manage users, roles, and permissions</p>
                  <div className="placeholder-content">
                    <p>Member management coming soon...</p>
                  </div>
                </div>
              )}

              {/* Custom Domain */}
              {activeTab === 'domain' && (
                <div className="settings-section">
                  <h2>Custom Domain</h2>
                  {!canUseCustomDomain ? (
                    <div className="upgrade-notice">
                      <p>⭐ Upgrade to Pro or higher to use your own custom domain</p>
                      <button onClick={() => navigate('/pricing')} className="btn btn-primary">
                        Upgrade Now
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="section-description">Use your own domain name for your forum</p>

                      <div className="form-group">
                        <label>Custom Domain</label>
                        <input
                          type="text"
                          value={settings.customDomain}
                          onChange={(e) => setSettings({ ...settings, customDomain: e.target.value })}
                          placeholder="forum.yourdomain.com"
                        />
                      </div>

                      {settings.customDomain && (
                        <div className="dns-instructions">
                          <h3>DNS Configuration</h3>
                          <p>Add the following CNAME record to your DNS settings:</p>
                          <div className="dns-record">
                            <div className="dns-field">
                              <label>Type:</label>
                              <code>CNAME</code>
                            </div>
                            <div className="dns-field">
                              <label>Name:</label>
                              <code>{settings.customDomain.split('.')[0]}</code>
                            </div>
                            <div className="dns-field">
                              <label>Value:</label>
                              <code>{settings.subdomain}.forums.snapitsoftware.com</code>
                            </div>
                          </div>
                          <p className="dns-note">
                            <strong>Note:</strong> SSL certificate will be automatically provisioned once DNS propagates (usually 5-30 minutes).
                          </p>
                          <div className={`status-badge ${settings.customDomainStatus}`}>
                            Status: {settings.customDomainStatus.replace('_', ' ')}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Analytics */}
              {activeTab === 'analytics' && (
                <div className="settings-section">
                  <h2>Analytics</h2>
                  <p className="section-description">View insights about your forum</p>
                  <div className="placeholder-content">
                    <p>Analytics dashboard coming soon...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
