'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authRequest } from '@/lib/auth';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const qsToken = searchParams.get('token');
    if (qsToken) setToken(qsToken);
  }, [searchParams]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await authRequest<{ message: string }>('/api/v1/auth/reset-password', {
        method: 'POST',
        body: {
          token,
          new_password: newPassword,
        },
      });

      toast.success(data.message || 'Password updated');
      window.location.href = '/login';
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold">Reset Password</h1>
        <p className="text-sm text-gray-600">Enter your reset token and new password.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Reset token"
            className="w-full border rounded-lg px-4 py-3"
            required
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min 8 chars)"
            className="w-full border rounded-lg px-4 py-3"
            minLength={8}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white rounded-lg py-3 disabled:opacity-70"
          >
            {loading ? 'Updating...' : 'Reset password'}
          </button>
        </form>

        <p className="text-sm text-gray-600">
          Back to{' '}
          <Link href="/login" className="text-purple-600 font-medium">
            login
          </Link>
        </p>
      </div>
    </div>
  );
}
