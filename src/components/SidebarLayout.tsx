'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSettings } from '../hooks/useSettings';

// Browser-native SHA-256 hashing
const hashPasscode = async (passcode: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(passcode);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname();
  const { settings, saveSettings, isLoaded, validateAndFetchProfile } = useSettings();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Settings form states
  const [token, setToken] = useState('');
  const [pollInterval, setPollInterval] = useState(300000);
  const [customRepos, setCustomRepos] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState(false);

  // Lock and Security states
  const [newPasscode, setNewPasscode] = useState('');
  const [hasPasscode, setHasPasscode] = useState(false);
  const [passcodeSuccess, setPasscodeSuccess] = useState(false);

  // Load settings into local state when they are retrieved
  useEffect(() => {
    if (settings) {
      const timer = setTimeout(() => {
        setToken(settings.token || '');
        setPollInterval(settings.pollInterval || 300000);
        setCustomRepos(settings.customRepos || '');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [settings]);

  // Passcode status sync
  const checkPasscodeStatus = () => {
    if (typeof window !== 'undefined') {
      setHasPasscode(!!localStorage.getItem('nova_passcode_hash'));
    }
  };

  useEffect(() => {
    checkPasscodeStatus();
    window.addEventListener('nova_security_updated', checkPasscodeStatus);
    return () => window.removeEventListener('nova_security_updated', checkPasscodeStatus);
  }, []);

  const handleLockWorkspace = () => {
    sessionStorage.removeItem('nova_session_authenticated');
    window.dispatchEvent(new Event('nova_security_updated'));
  };

  const handleSavePasscode = async () => {
    setPasscodeSuccess(false);
    if (!newPasscode.trim()) {
      // Disable passcode
      localStorage.removeItem('nova_passcode_hash');
      sessionStorage.removeItem('nova_session_authenticated');
      setNewPasscode('');
      window.dispatchEvent(new Event('nova_security_updated'));
      setPasscodeSuccess(true);
      setTimeout(() => setPasscodeSuccess(false), 2000);
      return;
    }

    try {
      const hash = await hashPasscode(newPasscode.trim());
      localStorage.setItem('nova_passcode_hash', hash);
      sessionStorage.setItem('nova_session_authenticated', 'true');
      setNewPasscode('');
      window.dispatchEvent(new Event('nova_security_updated'));
      setPasscodeSuccess(true);
      setTimeout(() => setPasscodeSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to hash passcode:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsValidating(true);
    setValidationError(null);
    setValidationSuccess(false);

    try {
      if (!token.trim()) {
        // Just save blank state if clearing
        saveSettings({
          ...settings,
          token: '',
          username: '',
          name: '',
          avatarUrl: '',
          pollInterval,
          customRepos,
        });
        setValidationSuccess(true);
        return;
      }

      // Fetch profile using token to check validity
      const profile = await validateAndFetchProfile(token.trim());

      saveSettings({
        ...settings,
        token: token.trim(),
        username: profile.username || '',
        avatarUrl: profile.avatarUrl || '',
        name: profile.name || profile.username || '',
        pollInterval,
        customRepos,
      });

      setValidationSuccess(true);
      setTimeout(() => {
        setIsSettingsOpen(false);
        setValidationSuccess(false);
      }, 1000);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to validate GitHub token';
      setValidationError(errMsg);
    } finally {
      setIsValidating(false);
    }
  };

  // Database Backup/Restore Helpers
  const handleExportTasks = () => {
    try {
      const data = localStorage.getItem('nova_tasks') || '[]';
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nova-tasks-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Backup failed:', err);
      alert('Failed to export tasks backup');
    }
  };

  const handleImportTasks = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const resultText = reader.result;
        if (typeof resultText !== 'string') {
          throw new Error('Could not read backup file contents');
        }
        const json = JSON.parse(resultText);
        if (!Array.isArray(json)) {
          throw new Error('Backup format invalid (must be a JSON array)');
        }
        localStorage.setItem('nova_tasks', JSON.stringify(json));
        window.dispatchEvent(new Event('nova_tasks_updated'));
        alert('Tasks database successfully restored!');
        e.target.value = ''; // Reset input
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        alert(`Restore failed: ${errMsg}`);
      }
    };
    reader.readAsText(file);
  };

  const navItems = [
    {
      name: 'Pull Requests',
      href: '/',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="18" r="3" />
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M18 15V9a4 4 0 0 0-4-4H9" />
          <line x1="6" y1="9" x2="6" y2="15" />
        </svg>
      ),
    },
    {
      name: 'Task Board',
      href: '/tasks',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
      ),
    },
    {
      name: 'Placements',
      href: '/placements',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="M8 14h.01" />
          <path d="M12 14h.01" />
          <path d="M16 14h.01" />
          <path d="M8 18h.01" />
          <path d="M12 18h.01" />
          <path d="M16 18h.01" />
        </svg>
      ),
    },
  ];

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="app-sidebar">
        <div className="sidebar-logo">
          <Link href="/" aria-label="Go to homepage" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <h1>Nova</h1>
          </Link>
        </div>

        <ul className="sidebar-menu">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name} className={`sidebar-item ${isActive ? 'active' : ''}`}>
                <Link href={item.href}>
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Sidebar Footer / Settings Trigger */}
        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem 1rem' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="user-profile-name" style={{ marginLeft: '0.75rem' }}>Settings</span>
          </button>

          {hasPasscode && (
            <button
              onClick={handleLockWorkspace}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '0.65rem 1rem' }}
              title="Lock Workspace"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="user-profile-name" style={{ marginLeft: '0.75rem' }}>Lock Session</span>
            </button>
          )}

          {isLoaded && settings?.username && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', padding: '0 0.5rem' }} className="user-profile-name">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.avatarUrl}
                alt={settings.name || settings.username}
                style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid var(--secondary)' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {settings.name || settings.username}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>@{settings.username}</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content panel */}
      <main className="app-content">
        {children}
      </main>

      {/* Settings Drawer Slide-Over */}
      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => settings?.token && setIsSettingsOpen(false)}>
          <div className="settings-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2 style={{ fontSize: '1.25rem' }}>Nova Settings</h2>
              {settings?.token && (
                <button className="drawer-close" onClick={() => setIsSettingsOpen(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            <form onSubmit={handleSave} className="settings-section">
              <h3>GitHub Authentication</h3>
              <p>Enter a Personal Access Token (classic or fine-grained) to load pull requests automatically.</p>
              
              <div className="settings-group">
                <label htmlFor="token">Personal Access Token</label>
                <div className="input-group">
                  <span className="input-icon" style={{ left: '0.85rem' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="token"
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.25rem' }}
                    placeholder="ghp_..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                </div>
              </div>

              {validationError && (
                <div className="badge badge-error" style={{ width: '100%', justifyContent: 'center', padding: '0.5rem' }}>
                  {validationError}
                </div>
              )}

              {validationSuccess && (
                <div className="badge badge-success" style={{ width: '100%', justifyContent: 'center', padding: '0.5rem' }}>
                  Settings saved successfully!
                </div>
              )}

              <button
                type="submit"
                disabled={isValidating}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                {isValidating ? (
                  <>
                    <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                    Validating...
                  </>
                ) : (
                  'Connect GitHub'
                )}
              </button>
            </form>

            {settings?.username && (
              <div className="settings-section">
                <h3>Current Profile</h3>
                <div className="profile-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={settings.avatarUrl} alt="Avatar" className="profile-avatar" />
                  <div className="profile-info">
                    <h4>{settings.name}</h4>
                    <p>Username: @{settings.username}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="settings-section">
              <h3>Preferences</h3>

              <div className="settings-group">
                <label htmlFor="repos">Filter Repositories (Optional)</label>
                <input
                  id="repos"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  placeholder="e.g. facebook/react, vercel/next.js"
                  value={customRepos}
                  onChange={(e) => setCustomRepos(e.target.value)}
                />
                <p>Comma-separated repositories. If empty, loads PRs across all repositories.</p>
              </div>

              <div className="settings-group">
                <label htmlFor="poll">Sync Refresh Rate</label>
                <select
                  id="poll"
                  className="form-select"
                  value={pollInterval}
                  onChange={(e) => setPollInterval(Number(e.target.value))}
                >
                  <option value={60000}>Every 1 minute</option>
                  <option value={120000}>Every 2 minutes</option>
                  <option value={300000}>Every 5 minutes</option>
                  <option value={600000}>Every 10 minutes</option>
                  <option value={1800000}>Every 30 minutes</option>
                </select>
              </div>
              
              <button
                type="button"
                onClick={handleSave}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Save Preferences
              </button>
            </div>

            <div className="settings-section">
              <h3>Security (Local Lock)</h3>
              <p>Set a lock passcode to encrypt and protect your dashboard on this device.</p>
              
              <div className="settings-group">
                <label htmlFor="passcode-input">
                  {hasPasscode ? 'Change / Disable Passcode' : 'New Passcode'}
                </label>
                <div className="input-group">
                  <span className="input-icon" style={{ left: '0.85rem' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="passcode-input"
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.25rem' }}
                    placeholder={hasPasscode ? 'Enter new passcode (or leave blank to disable)' : 'Enter passcode'}
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value)}
                  />
                </div>
              </div>

              {passcodeSuccess && (
                <div className="badge badge-success" style={{ width: '100%', justifyContent: 'center', padding: '0.5rem' }}>
                  Passcode updated successfully!
                </div>
              )}

              <button
                type="button"
                onClick={handleSavePasscode}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                {hasPasscode && !newPasscode ? 'Disable Lock Passcode' : 'Save Passcode'}
              </button>
            </div>

            <div className="settings-section">
              <h3>Database Tools</h3>
              <p>Export your local task database to share across devices, or restore from a backup file.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleExportTasks}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.6rem 0.8rem' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.25rem' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export Tasks
                </button>
                <label className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.6rem 0.8rem', cursor: 'pointer' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.25rem' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Import Tasks
                  <input
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleImportTasks}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
