import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { user, loginWithGoogle, GOOGLE_CLIENT_ID } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Initialize Google Sign-In
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse
      });

      window.google.accounts.id.renderButton(
        document.getElementById('googleSignInButton'),
        {
          theme: 'outline',
          size: 'large',
          width: 300,
          text: 'signin_with'
        }
      );
    }
  }, []);

  const handleGoogleResponse = async (response) => {
    try {
      await loginWithGoogle(response.credential);
      navigate('/dashboard');
    } catch (error) {
      alert('Login failed. Please try again.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Welcome to Forum Builder</h1>
          <p>Sign in to create and manage your forums</p>
        </div>

        <div className="login-card">
          <h2>Sign In</h2>
          <p className="login-subtitle">Use your Google account to get started</p>

          <div id="googleSignInButton" className="google-btn-container"></div>

          <div className="login-features">
            <h3>What you get:</h3>
            <ul>
              <li>✓ Free tier with 1 forum & 500 members</li>
              <li>✓ Easy forum management dashboard</li>
              <li>✓ Customizable themes and branding</li>
              <li>✓ Upgrade anytime for more features</li>
            </ul>
          </div>
        </div>

        <div className="login-footer">
          <p>Don't have an account? Sign up with Google automatically!</p>
          <a href="/" className="back-link">← Back to Home</a>
        </div>
      </div>
    </div>
  );
}
