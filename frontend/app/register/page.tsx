'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const checks = {
    min: password.length >= 8,
    maxBytes: new TextEncoder().encode(password).length <= 72,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = 'Full name is required';
    if (!email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase())) next.email = 'Enter a valid email address';

    if (!checks.min || !checks.maxBytes || !checks.lower || !checks.upper || !checks.number || !checks.special) {
      next.password = 'Password does not meet security requirements';
    }
    if (!confirmPassword) next.confirmPassword = 'Confirm your password';
    else if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const data = await authRequest<RegisterResponse>('/api/v1/auth/register', {
        method: 'POST',
        useCredentials: true,
        body: {
          email: email.trim().toLowerCase(),
          password,
          full_name: fullName.trim(),
        },
      });

      persistTokenForLegacyPages(data.access_token);
      toast.success(data.message || 'Registered successfully');
      router.replace('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <main className="app-container flex min-h-screen items-center justify-center">
        <section className="ds-card w-full max-w-md space-y-5 p-6 sm:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Get started</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Create your account</h1>
            <p className="mt-1 text-sm text-slate-600">Simple setup in less than a minute.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label className="ds-label" htmlFor="fullName">Full name</label>
              <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className="ds-input" autoComplete="name" />
              {errors.fullName && <p className="mt-1 text-xs text-rose-600">{errors.fullName}</p>}
            </div>

            <div>
              <label className="ds-label" htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="ds-input" autoComplete="email" />
              {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
            </div>

            <div>
              <label className="ds-label" htmlFor="password">Password</label>
              <div className="relative">
                <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a strong password" className="ds-input pr-20" autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">{showPassword ? 'Hide' : 'Show'}</button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password}</p>}
              <ul className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-600">
                <li className={checks.min ? 'text-emerald-700' : ''}>• At least 8 characters</li>
                <li className={checks.maxBytes ? 'text-emerald-700' : ''}>• At most 72 bytes</li>
                <li className={checks.lower ? 'text-emerald-700' : ''}>• One lowercase letter</li>
                <li className={checks.upper ? 'text-emerald-700' : ''}>• One uppercase letter</li>
                <li className={checks.number ? 'text-emerald-700' : ''}>• One number</li>
                <li className={checks.special ? 'text-emerald-700' : ''}>• One special character</li>
              </ul>
            </div>

            <div>
              <label className="ds-label" htmlFor="confirmPassword">Confirm password</label>
              <div className="relative">
                <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" className="ds-input pr-20" autoComplete="new-password" />
                <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">{showConfirmPassword ? 'Hide' : 'Show'}</button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword}</p>}
            </div>

            <button type="submit" disabled={loading} className="ds-btn-primary w-full disabled:opacity-70">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-sm text-slate-600">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-slate-900 underline underline-offset-4">Sign in</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
