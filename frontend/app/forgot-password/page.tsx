'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authRequest } from '../../lib/auth';

type ForgotResponse = {
  message: string;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await authRequest<ForgotResponse>('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim().toLowerCase() },
      });

      setIsSubmitted(true);
      toast.success(data.message || 'If an account exists, reset instructions have been sent.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <main className="app-container flex min-h-screen items-center justify-center">
        <section className="ds-card w-full max-w-md space-y-5 p-6 sm:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Account recovery</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Forgot password?</h1>
            <p className="mt-1 text-sm text-slate-600">Enter your email and we will send reset instructions if your account exists.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="ds-label" htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="ds-input" required autoComplete="email" />
            </div>
            <button type="submit" disabled={loading} className="ds-btn-primary w-full disabled:opacity-70">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          {isSubmitted && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              If an account exists for this email, a reset link has been sent.
            </div>
          )}

          <p className="text-sm text-slate-600">
            Back to{' '}
            <Link href="/login" className="font-semibold text-slate-900 underline underline-offset-4">
              login
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
