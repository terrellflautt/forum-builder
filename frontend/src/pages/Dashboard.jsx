import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  const { user, token, logout, API_URL } = useAuth();
  const navigate = useNavigate();
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchForums();
  }, []);

  const fetchForums = async () => {
    try {
      const response = await fetch(`${API_URL}/forums`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setForums(data.forums || []);
      }
    } catch (error) {
      console.error('Failed to fetch forums:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForum = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const response = await fetch(`${API_URL}/forums`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'FORUM_LIMIT_REACHED') {
          setError(`You've reached your forum limit. Upgrade to create more forums.`);
        } else if (data.code === 'SUBDOMAIN_TAKEN') {
          setError('This subdomain is already taken. Please choose another.');
        } else {
          setError(data.error || 'Failed to create forum');
        }
        return;
      }

      // Success - refresh forums and close modal
      await fetchForums();
      setShowCreateModal(false);
      setFormData({ name: '', subdomain: '', description: '' });
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteForum = async (forumId) => {
    if (!confirm('Are you sure you want to delete this forum? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/forums/${forumId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchForums();
      } else {
        alert('Failed to delete forum');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const formatSubdomain = (subdomain) => {
    return subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  };

  const getTierInfo = () => {
    const tier = user?.subscriptionTier || 'free';
    const limits = {
      free: { forums: 1, members: 500, name: 'Free' },
      pro: { forums: 3, members: 5000, name: 'Pro' },
      business: { forums: 10, members: 25000, name: 'Business' },
      enterprise: { forums: -1, members: -1, name: 'Enterprise' }
    };
    return limits[tier];
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your forums...</p>
      </div>
    );
  }

  const tierInfo = getTierInfo();
  const canCreateMore = tierInfo.forums === -1 || forums.length < tierInfo.forums;

  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <span className="logo-text">Forum Builder</span>
            </div>
            <div className="user-menu">
              <span className="user-email">{user?.email}</span>
              <button onClick={logout} className="btn btn-secondary">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        <div className="container">
          {/* Subscription Info */}
          <div className="subscription-card">
            <div className="subscription-info">
              <h3>
                {tierInfo.name} Plan
                {tierInfo.name === 'Free' && <span className="tier-badge free">Free</span>}
                {tierInfo.name === 'Pro' && <span className="tier-badge pro">Pro</span>}
                {tierInfo.name === 'Business' && <span className="tier-badge business">Business</span>}
              </h3>
              <p>
                Forums: {forums.length} / {tierInfo.forums === -1 ? '∞' : tierInfo.forums} •
                Members per forum: {tierInfo.members === -1 ? 'Unlimited' : tierInfo.members.toLocaleString()}
              </p>
            </div>
            {tierInfo.name === 'Free' && (
              <button onClick={() => navigate('/pricing')} className="btn btn-primary">
                Upgrade Plan
              </button>
            )}
          </div>

          {/* Forums Section */}
          <div className="forums-section">
            <div className="section-header">
              <h2>My Forums</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
                disabled={!canCreateMore}
              >
                + Create Forum
              </button>
            </div>

            {!canCreateMore && (
              <div className="limit-warning">
                You've reached your forum limit. <a href="/pricing">Upgrade your plan</a> to create more forums.
              </div>
            )}

            {forums.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No forums yet</h3>
                <p>Create your first forum to get started!</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary btn-lg"
                  disabled={!canCreateMore}
                >
                  Create Your First Forum
                </button>
              </div>
            ) : (
              <div className="forums-grid">
                {forums.map(forum => (
                  <div key={forum.forumId} className="forum-card">
                    <div className="forum-header">
                      <h3>{forum.name}</h3>
                      <span className={`status-badge ${forum.isActive ? 'active' : 'inactive'}`}>
                        {forum.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="forum-description">{forum.description || 'No description'}</p>
                    <div className="forum-stats">
                      <div className="stat">
                        <span className="stat-label">Subdomain</span>
                        <span className="stat-value">{forum.subdomain}.forums.snapitsoftware.com</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Members</span>
                        <span className="stat-value">{forum.memberCount || 0}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Created</span>
                        <span className="stat-value">{new Date(forum.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="forum-actions">
                      <Link
                        to={`/forum/${forum.forumId}/settings`}
                        className="btn btn-primary"
                      >
                        Manage Settings
                      </Link>
                      <a
                        href={`https://${forum.subdomain}.forums.snapitsoftware.com`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                      >
                        Visit Forum
                      </a>
                      <button
                        onClick={() => handleDeleteForum(forum.forumId)}
                        className="btn btn-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Forum Modal */}
      {showCreateModal && (
        <div className="modal" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Forum</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateForum}>
              <div className="form-group">
                <label>Forum Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Awesome Forum"
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label>Subdomain *</label>
                <div className="subdomain-input">
                  <input
                    type="text"
                    required
                    value={formData.subdomain}
                    onChange={(e) => setFormData({ ...formData, subdomain: formatSubdomain(e.target.value) })}
                    placeholder="my-forum"
                    pattern="[a-z0-9-]+"
                    maxLength={50}
                  />
                  <span className="subdomain-suffix">.forums.snapitsoftware.com</span>
                </div>
                <small>Only lowercase letters, numbers, and hyphens</small>
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="A brief description of your forum"
                  rows={3}
                  maxLength={500}
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Forum'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
