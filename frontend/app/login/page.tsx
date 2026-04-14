'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { authRequest, clearLegacyToken, persistTokenForLegacyPages } from '../../lib/auth';

type LoginResponse = {
  message: string;
  access_token?: string;
  user: {
    id: number;
    email: string;
    full_name?: string | null;
  };
};

type AuthMeResponse = {
  id: number;
  email?: string;
  full_name?: string | null;
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [meLoading, setMeLoading] = useState(false);
  const [meData, setMeData] = useState<AuthMeResponse | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await authRequest<LoginResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      persistTokenForLegacyPages(data.access_token);
      toast.success(data.message || 'Login successful');
      window.location.href = '/';
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentUser = async () => {
    setMeLoading(true);
    try {
      const data = await authRequest<AuthMeResponse>('/api/v1/auth/me', { useCredentials: true });
      setMeData(data);
      toast.success('Fetched current user from cookie session');
    } catch (error) {
      setMeData(null);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch user');
    } finally {
      setMeLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authRequest<{ message: string }>('/api/v1/auth/logout', { method: 'POST', useCredentials: true });
      clearLegacyToken();
      setMeData(null);
      toast.success('Logged out');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Logout failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold mb-2">Email Login</h1>
          <p className="text-sm text-gray-600">Sign in with your email and password</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border rounded-lg px-4 py-3"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full border rounded-lg px-4 py-3"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white rounded-lg py-3 disabled:opacity-70"
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-purple-600 font-medium">
            Forgot password?
          </Link>
          <Link href="/register" className="text-purple-600 font-medium">
            Create account
          </Link>
        </div>

        <div className="border-t pt-4 space-y-2">
          <p className="text-xs text-gray-500">Auth cookie quick test</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={checkCurrentUser}
              disabled={meLoading}
              className="flex-1 border border-gray-300 rounded-lg py-2 text-sm"
            >
              {meLoading ? 'Checking...' : 'Check /auth/me'}
            </button>
            <button
              type="button"
              onClick={logout}
              className="flex-1 border border-red-300 text-red-600 rounded-lg py-2 text-sm"
            >
              Logout
            </button>
          </div>
          {meData && (
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
              {JSON.stringify(meData, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}