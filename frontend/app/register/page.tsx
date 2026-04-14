'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authRequest, persistTokenForLegacyPages } from '../../lib/auth';

type RegisterResponse = {
  message: string;
  access_token?: string;
  user: {
    id: number;
    email: string;
    full_name?: string | null;
  };
};

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await authRequest<RegisterResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: {
          email,
          password,
          full_name: fullName || null,
        },
      });

      persistTokenForLegacyPages(data.access_token);
      toast.success(data.message || 'Registered successfully');
      window.location.href = '/';
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow p-6">
        <h1 className="text-2xl font-bold mb-2">Create Account</h1>
        <p className="text-sm text-gray-600 mb-6">Register with email and password</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name (optional)"
            className="w-full border rounded-lg px-4 py-3"
          />
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
            placeholder="Password (min 8 chars)"
            className="w-full border rounded-lg px-4 py-3"
            minLength={8}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white rounded-lg py-3 disabled:opacity-70"
          >
            {loading ? 'Creating...' : 'Register'}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-purple-600 font-medium">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
