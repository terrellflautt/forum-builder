import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './UserProfile.css';

export default function UserProfile() {
  const { username } = useParams();
  const { API_URL, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [links, setLinks] = useState([]);
  const [bio, setBio] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const isOwnProfile = user && (user.username === username || user.email.split('@')[0] === username);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/${username}`);
      const data = await response.json();

      if (response.ok) {
        setProfile(data.user);
        setLinks(data.user.links || []);
        setBio(data.user.bio || '');
      } else {
        console.error('Failed to fetch profile:', data.error);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = () => {
    if (!newLinkTitle || !newLinkUrl) return;

    const newLink = {
      id: Date.now(),
      title: newLinkTitle,
      url: newLinkUrl.startsWith('http') ? newLinkUrl : `https://${newLinkUrl}`
    };

    setLinks([...links, newLink]);
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const handleRemoveLink = (linkId) => {
    setLinks(links.filter(link => link.id !== linkId));
  };

  const handleSaveProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/users/${username}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bio,
          links
        })
      });

      const data = await response.json();

      if (response.ok) {
        setProfile(data.user);
        setEditing(false);
        alert('Profile updated successfully!');
      } else {
        alert(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Network error. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="empty-state">
          <h2>User Not Found</h2>
          <p>The profile @{username} doesn't exist.</p>
          <Link to="/discover" className="btn btn-primary">Discover Users</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <header className="profile-header">
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <Link to="/" className="logo-text">Forum Builder</Link>
            </div>
            <nav className="nav">
              <Link to="/discover">Discover</Link>
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

      {/* Profile Content */}
      <section className="profile-content">
        <div className="container">
          {/* Profile Card */}
          <div className="profile-card">
            <div className="profile-banner"></div>
            <div className="profile-main">
              <div className="profile-avatar-wrapper">
                {profile.profilePicture ? (
                  <img src={profile.profilePicture} alt={username} className="profile-avatar" />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {username[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="profile-info">
                <h1>@{username}</h1>
                {editing ? (
                  <textarea
                    className="bio-input"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell the world about yourself..."
                    rows="3"
                  />
                ) : (
                  <p className="profile-bio">{bio || 'No bio yet.'}</p>
                )}
                <div className="profile-stats">
                  <div className="stat">
                    <span className="stat-value">{profile.karma || 0}</span>
                    <span className="stat-label">Karma</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{profile.forumCount || 0}</span>
                    <span className="stat-label">Forums</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{profile.postCount || 0}</span>
                    <span className="stat-label">Posts</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{profile.followerCount || 0}</span>
                    <span className="stat-label">Followers</span>
                  </div>
                </div>
                {isOwnProfile && (
                  <div className="profile-actions">
                    {editing ? (
                      <>
                        <button onClick={handleSaveProfile} className="btn btn-primary">
                          Save Changes
                        </button>
                        <button onClick={() => setEditing(false)} className="btn btn-secondary">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setEditing(true)} className="btn btn-primary">
                        Edit Profile
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Linktree-style Links */}
          <div className="links-section">
            <div className="section-header">
              <h2>Links</h2>
              {isOwnProfile && editing && (
                <button onClick={() => {}} className="btn btn-secondary btn-sm">
                  Customize Theme
                </button>
              )}
            </div>

            {/* Add New Link (when editing) */}
            {isOwnProfile && editing && (
              <div className="add-link-form">
                <input
                  type="text"
                  placeholder="Link title (e.g., My Website)"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  className="link-input"
                />
                <input
                  type="text"
                  placeholder="URL (e.g., https://example.com)"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="link-input"
                />
                <button onClick={handleAddLink} className="btn btn-primary">
                  Add Link
                </button>
              </div>
            )}

            {/* Links Grid */}
            <div className="links-grid">
              {links.length === 0 ? (
                <div className="empty-links">
                  <p>No links yet. {isOwnProfile && 'Click "Edit Profile" to add some!'}</p>
                </div>
              ) : (
                links.map(link => (
                  <div key={link.id} className="link-card">
                    {editing && isOwnProfile && (
                      <button
                        onClick={() => handleRemoveLink(link.id)}
                        className="remove-link-btn"
                      >
                        ✕
                      </button>
                    )}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-content"
                    >
                      <span className="link-title">{link.title}</span>
                      <span className="link-arrow">→</span>
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity (Pinterest-style grid) */}
          <div className="activity-section">
            <h2>Recent Activity</h2>
            <div className="activity-grid">
              {profile.recentPosts && profile.recentPosts.length > 0 ? (
                profile.recentPosts.map(post => (
                  <Link
                    key={post.postId}
                    to={`/${post.forumSubdomain}/posts/${post.postId}`}
                    className="activity-card"
                  >
                    <h3>{post.title}</h3>
                    <p className="activity-excerpt">{post.content?.substring(0, 150)}...</p>
                    <div className="activity-meta">
                      <span className="forum-name">/{post.forumSubdomain}</span>
                      <span className="post-stats">
                        ↑ {post.voteScore || 0} · 💬 {post.commentCount || 0}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="empty-activity">
                  <p>No recent activity.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="profile-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Forum Builder</h4>
              <p>Free Linktree alternative + professional forums</p>
            </div>
            <div className="footer-section">
              <h4>Create Yours</h4>
              <Link to="/login">Get Started Free</Link>
              <Link to="/pricing">View Plans</Link>
              <Link to="/discover">Discover Communities</Link>
            </div>
            <div className="footer-section">
              <h4>SnapIT Suite</h4>
              <a href="https://snapitsoftware.com">SnapIT Software</a>
              <a href="https://polls.snapitsoftware.com">SnapIT Polls</a>
              <a href="https://snapitforms.com">SnapIT Forms</a>
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
