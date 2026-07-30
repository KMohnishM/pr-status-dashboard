'use client';

import React, { useState, useEffect } from 'react';

// Browser-native SHA-256 hashing
const hashPasscode = async (passcode: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(passcode);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

interface AuthGateProps {
  children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPasscode, setHasPasscode] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkAuth = () => {
    try {
      const savedHash = localStorage.getItem('nova_passcode_hash');
      const sessionAuth = sessionStorage.getItem('nova_session_authenticated') === 'true';

      if (!savedHash) {
        // No passcode set, proceed immediately
        setHasPasscode(false);
        setIsAuthenticated(true);
      } else {
        setHasPasscode(true);
        if (sessionAuth) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      }
    } catch {
      // LocalStorage might be disabled in some environments
      setIsAuthenticated(true);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkAuth();

    // Listen for security setting changes in the app
    const handleSync = () => checkAuth();
    window.addEventListener('nova_security_updated', handleSync);
    return () => window.removeEventListener('nova_security_updated', handleSync);
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);

    try {
      const savedHash = localStorage.getItem('nova_passcode_hash');
      if (!savedHash) return;

      const inputHash = await hashPasscode(passcode);
      if (inputHash === savedHash) {
        sessionStorage.setItem('nova_session_authenticated', 'true');
        setIsAuthenticated(true);
        setPasscode('');
      } else {
        setError(true);
        setPasscode('');
      }
    } catch {
      setError(true);
    }
  };

  if (isChecking) {
    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#040209', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (hasPasscode && !isAuthenticated) {
    return (
      <div
        style={{
          display: 'flex',
          width: '100vw',
          height: '100vh',
          background: '#040209',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 99999,
        }}
      >
        {/* Glow Background blobs */}
        <div
          style={{
            position: 'absolute',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(167, 139, 250, 0.15) 0%, transparent 70%)',
            filter: 'blur(50px)',
            pointerEvents: 'none',
          }}
        />

        <div
          className="glass-panel"
          style={{
            width: '380px',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.75rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            border: '1px solid var(--border-glass)',
          }}
        >
          {/* Lock Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(167, 139, 250, 0.08)',
                border: '1px solid var(--border-glass-active)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                filter: 'drop-shadow(0 0 10px var(--primary-glow))',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.5rem', fontFamily: 'var(--font-heading)' }}>Nova Protected</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Enter passcode to unlock your workspace</p>
          </div>

          <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="settings-group" style={{ textAlign: 'left' }}>
              <div className="input-group">
                <span className="input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <span className="badge badge-error" style={{ width: '100%', justifyContent: 'center', padding: '0.5rem' }}>
                Incorrect passcode
              </span>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Unlock Workspace
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
