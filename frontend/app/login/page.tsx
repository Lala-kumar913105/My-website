'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  authRequest,
  consumePostLoginRedirect,
  persistPostLoginRedirect,
  persistTokenForLegacyPages,
} from '../../lib/auth';

type LoginResponse = {
  message: string;
  access_token?: string;
  user: {
    id: number;
    email: string;
    full_name?: string | null;
  };
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    const redirect = searchParams.get('redirect') || searchParams.get('next');
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      persistPostLoginRedirect(redirect);
    }
  }, [searchParams]);

  const validate = () => {
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email.trim().toLowerCase())) {
      nextErrors.email = 'Enter a valid email address';
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const data = await authRequest<LoginResponse>('/api/v1/auth/login', {
        method: 'POST',
        useCredentials: true,
        body: { email: email.trim().toLowerCase(), password },
      });

      persistTokenForLegacyPages(data.access_token);
      toast.success(data.message || 'Login successful');
      const redirectTarget = consumePostLoginRedirect('/');
      router.replace(redirectTarget);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <main className="app-container flex min-h-screen items-center justify-center">
        <section className="ds-card w-full max-w-md space-y-5 p-6 sm:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Welcome back</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Sign in to your account</h1>
            <p className="mt-1 text-sm text-slate-600">Continue to shop, book services, and manage your dashboard.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label className="ds-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="you@example.com"
                className="ds-input"
                autoComplete="email"
              />
              {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
            </div>

            <div>
              <label className="ds-label" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="Enter your password"
                  className="ds-input pr-20"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading} className="ds-btn-primary w-full disabled:opacity-70">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="flex items-center justify-between gap-3 text-sm">
            <Link href="/forgot-password" className="font-medium text-slate-700 hover:text-slate-900">Forgot password?</Link>
            <Link href="/register" className="font-semibold text-slate-900 underline underline-offset-4">Create account</Link>
          </div>
        </section>
      </main>
    </div>
  );
}