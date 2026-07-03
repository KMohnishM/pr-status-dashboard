import { useState, useEffect, useCallback } from 'react';
import { SettingsState } from '../types';

const SETTINGS_KEY = 'nova_settings';

const DEFAULT_SETTINGS: SettingsState = {
  token: '',
  username: '',
  avatarUrl: '',
  name: '',
  pollInterval: 300000, // 5 minutes
  customRepos: '',
};

export function useSettings() {
  const [settings, setSettingsState] = useState<SettingsState | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      // Look for environment variables if localstorage is empty
      const envToken = process.env.NEXT_PUBLIC_GITHUB_TOKEN || '';
      const envUser = process.env.NEXT_PUBLIC_GITHUB_USERNAME || '';
      if (envToken || envUser) {
        const initial = {
          ...DEFAULT_SETTINGS,
          token: envToken,
          username: envUser,
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(initial));
        return initial;
      }
      return DEFAULT_SETTINGS;
    } catch (e) {
      console.error('Failed to load settings:', e);
      return DEFAULT_SETTINGS;
    }
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);


  const saveSettings = useCallback((newSettings: SettingsState) => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      setSettingsState(newSettings);

      // Dispatch event to sync settings across tabs/components
      window.dispatchEvent(new Event('nova_settings_updated'));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, []);

  // Listen for updates from other parts of the app
  useEffect(() => {
    const handleSync = () => {
      try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
          setSettingsState(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to sync settings:', e);
      }
    };

    window.addEventListener('nova_settings_updated', handleSync);
    window.addEventListener('storage', handleSync); // Sync across tabs

    return () => {
      window.removeEventListener('nova_settings_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Pre-fetch viewer information to auto-fill username, name, and avatar
  const validateAndFetchProfile = async (token: string): Promise<Partial<SettingsState>> => {
    if (!token) throw new Error('Token is required');

    const query = `
      query {
        viewer {
          login
          avatarUrl
          name
        }
      }
    `;

    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned status ${response.status}. Please check your token.`);
    }

    const body = await response.json();
    if (body.errors && body.errors.length > 0) {
      throw new Error(body.errors[0].message);
    }

    const viewer = body.data?.viewer;
    if (!viewer) {
      throw new Error('Could not retrieve viewer profile');
    }

    return {
      username: viewer.login,
      avatarUrl: viewer.avatarUrl,
      name: viewer.name || viewer.login,
    };
  };

  return {
    settings,
    saveSettings,
    isLoaded,
    validateAndFetchProfile,
  };
}
