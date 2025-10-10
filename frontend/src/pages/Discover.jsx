import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Discover.css';

export default function Discover() {
  const { API_URL } = useAuth();
  const [view, setView] = useState('forums'); // 'forums', 'users', 'topics'
  const [sortBy, setSortBy] = useState('activity');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchItems();
  }, [view, sortBy]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const endpoint = `${API_URL}/discover/${view}?sort=${sortBy}&limit=100`;
      const response = await fetch(endpoint);
      const data = await response.json();

      if (response.ok) {
        setItems(data.items || []);
      } else {
        console.error('Failed to fetch items:', data.error);
        setItems([]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    if (view === 'forums') {
      return item.name?.toLowerCase().includes(query) ||
             item.description?.toLowerCase().includes(query);
    } else if (view === 'users') {
      return item.email?.toLowerCase().includes(query) ||
             item.username?.toLowerCase().includes(query);
    } else if (view === 'topics') {
      return item.name?.toLowerCase().includes(query);
    }
    return false;
  });

  const getSortOptions = () => {
    if (view === 'forums') {
      return [
        { value: 'activity', label: 'Most Active' },
        { value: 'members', label: 'Most Members' },
        { value: 'posts', label: 'Most Posts' },
        { value: 'newest', label: 'Newest' }
      ];
    } else if (view === 'users') {
      return [
        { value: 'karma', label: 'Top Karma' },
        { value: 'forums', label: 'Most Forums' },
        { value: 'activity', label: 'Most Active' },
        { value: 'newest', label: 'Newest' }
      ];
    } else {
      return [
        { value: 'trending', label: 'Trending' },
        { value: 'posts', label: 'Most Posts' },
        { value: 'engagement', label: 'Most Engagement' }
      ];
    }
  };

  const renderForumCard = (forum, index) => (
    <Link to={`/${forum.subdomain}`} key={forum.forumId} className="discover-card forum-card">
      <div className="card-rank">#{index + 1}</div>
      <div className="card-content">
        <h3>{forum.name}</h3>
        <p className="card-description">{forum.description}</p>
        <div className="card-stats">
          <div className="stat">
            <span className="stat-value">{formatNumber(forum.memberCount || 0)}</span>
            <span className="stat-label">Members</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatNumber(forum.postCount || 0)}</span>
            <span className="stat-label">Posts</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatNumber(forum.activityScore || 0)}</span>
            <span className="stat-label">Activity</span>
          </div>
        </div>
        <div className="card-meta">
          <span className="forum-subdomain">/{forum.subdomain}</span>
          {forum.isPublic && <span className="badge badge-public">Public</span>}
        </div>
      </div>
    </Link>
  );

  const renderUserCard = (user, index) => (
    <Link to={`/@${user.username || user.email.split('@')[0]}`} key={user.userId} className="discover-card user-card">
      <div className="card-rank">#{index + 1}</div>
      <div className="card-content">
        <div className="user-header">
          <div className="user-avatar">
            {user.profilePicture ? (
              <img src={user.profilePicture} alt={user.username || user.email} />
            ) : (
              <div className="avatar-placeholder">
                {(user.username || user.email)[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="user-info">
            <h3>{user.username || user.email.split('@')[0]}</h3>
            <p className="user-email">{user.email}</p>
          </div>
        </div>
        <div className="card-stats">
          <div className="stat">
            <span className="stat-value">{formatNumber(user.karma || 0)}</span>
            <span className="stat-label">Karma</span>
          </div>
          <div className="stat">
            <span className="stat-value">{user.forumCount || 0}</span>
            <span className="stat-label">Forums</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatNumber(user.postCount || 0)}</span>
            <span className="stat-label">Posts</span>
          </div>
        </div>
      </div>
    </Link>
  );

  const renderTopicCard = (topic, index) => (
    <div key={topic.name} className="discover-card topic-card">
      <div className="card-rank">#{index + 1}</div>
      <div className="card-content">
        <h3>#{topic.name}</h3>
        <div className="card-stats">
          <div className="stat">
            <span className="stat-value">{formatNumber(topic.postCount || 0)}</span>
            <span className="stat-label">Posts</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatNumber(topic.engagement || 0)}</span>
            <span className="stat-label">Engagement</span>
          </div>
          <div className="stat">
            <span className="stat-value">{topic.forumCount || 0}</span>
            <span className="stat-label">Forums</span>
          </div>
        </div>
        {topic.trending && <span className="badge badge-trending">🔥 Trending</span>}
      </div>
    </div>
  );

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="discover-page">
      {/* Header */}
      <header className="discover-header">
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <Link to="/" className="logo-text">Forum Builder</Link>
            </div>
            <nav className="nav">
              <Link to="/discover">Discover</Link>
              <Link to="/pricing">Pricing</Link>
              <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="discover-hero">
        <div className="container">
          <h1>Discover Top Communities</h1>
          <p>Explore the world's most active forums, users, and trending topics</p>
        </div>
      </section>

      {/* Controls */}
      <section className="discover-controls">
        <div className="container">
          {/* View Toggle */}
          <div className="view-toggle">
            <button
              className={view === 'forums' ? 'active' : ''}
              onClick={() => setView('forums')}
            >
              Forums
            </button>
            <button
              className={view === 'users' ? 'active' : ''}
              onClick={() => setView('users')}
            >
              Users
            </button>
            <button
              className={view === 'topics' ? 'active' : ''}
              onClick={() => setView('topics')}
            >
              Topics
            </button>
          </div>

          {/* Search & Sort */}
          <div className="controls-row">
            <div className="search-box">
              <input
                type="text"
                placeholder={`Search ${view}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="sort-select">
              <label>Sort by:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                {getSortOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="discover-results">
        <div className="container">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading {view}...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              <h3>No {view} found</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="discover-grid">
              {filteredItems.map((item, index) => {
                if (view === 'forums') return renderForumCard(item, index);
                if (view === 'users') return renderUserCard(item, index);
                if (view === 'topics') return renderTopicCard(item, index);
                return null;
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="discover-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Forum Builder</h4>
              <p>Discover and connect with communities worldwide</p>
            </div>
            <div className="footer-section">
              <h4>Product</h4>
              <Link to="/pricing">Pricing</Link>
              <Link to="/discover">Discover</Link>
              <a href="https://forum.snapitsoftware.com">Support</a>
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
