'use client';

/**
 * Login/Registration Page
 * Uses WebAuthn for passwordless authentication
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get registration options
      const optionsRes = await fetch('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (!optionsRes.ok) {
        const data = await optionsRes.json();
        throw new Error(data.error || 'Failed to start registration');
      }

      const { options } = await optionsRes.json();

      // Start WebAuthn registration
      const credential = await startRegistration({ optionsJSON: options });

      // Verify registration
      const verifyRes = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || 'Registration failed');
      }

      // Redirect to main app
      router.push('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get authentication options
      const optionsRes = await fetch('/api/auth/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (!optionsRes.ok) {
        const data = await optionsRes.json();
        throw new Error(data.error || 'Failed to start login');
      }

      const { options } = await optionsRes.json();

      // Start WebAuthn authentication
      const credential = await startAuthentication({ optionsJSON: options });

      // Verify authentication
      const verifyRes = await fetch('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || 'Login failed');
      }

      // Redirect to main app
      router.push('/');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-10">
          <div className="mb-8">
            <h2 className="text-center text-4xl font-bold text-white mb-3">
              Todo App
            </h2>
            <p className="text-center text-base text-slate-300">
              {mode === 'login' 
                ? 'Sign in with your passkey' 
                : 'Create an account with a passkey'}
            </p>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-900/30 border border-red-600/50 p-4">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-slate-200">
                Username:
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-500/50"
              >
                {loading ? 'Processing...' : mode === 'login' ? 'Sign in with Passkey' : 'Register with Passkey'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              {mode === 'login' 
                ? "Don't have an account? Register" 
                : 'Already have an account? Sign in'}
            </button>
          </div>

          <div className="mt-8 text-xs text-slate-400 text-center leading-relaxed">
            <p>Passkeys use your device's biometrics (fingerprint, face recognition) or PIN for secure authentication. No passwords needed.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
