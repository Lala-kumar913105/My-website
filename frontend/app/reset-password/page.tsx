'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authRequest } from '../../lib/auth';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenChecking, setTokenChecking] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const checks = {
    min: newPassword.length >= 8,
    lower: /[a-z]/.test(newPassword),
    upper: /[A-Z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  };

  useEffect(() => {
    const qsToken = searchParams.get('token');
    if (qsToken) {
      setToken(qsToken);
      authRequest<{ valid: boolean; message: string }>(`/api/v1/auth/reset-password/validate?token=${encodeURIComponent(qsToken)}`)
        .then((res) => {
          setTokenError(res.valid ? null : res.message || 'Invalid or expired reset token');
        })
        .catch((error) => {
          setTokenError(error instanceof Error ? error.message : 'Unable to validate reset link');
        })
        .finally(() => setTokenChecking(false));
    } else {
      setTokenError('Reset token is missing from this link.');
      setTokenChecking(false);
    }
  }, [searchParams]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!token.trim()) next.token = 'Reset token is required';
    if (!checks.min || !checks.lower || !checks.upper || !checks.number || !checks.special) {
      next.newPassword = 'Password does not meet security requirements';
    }
    if (!confirmPassword) next.confirmPassword = 'Please confirm new password';
    else if (confirmPassword !== newPassword) next.confirmPassword = 'Passwords do not match';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

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
      router.replace('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <main className="app-container flex min-h-screen items-center justify-center">
        <section className="ds-card w-full max-w-md space-y-5 p-6 sm:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Secure reset</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Set a new password</h1>
            <p className="mt-1 text-sm text-slate-600">Choose a strong password you haven't used before.</p>
          </div>

          {tokenChecking ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Validating reset link...</div>
          ) : tokenError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{tokenError}</div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <input type="hidden" value={token} readOnly />
              {errors.token && <p className="text-xs text-rose-600">{errors.token}</p>}

              <div>
                <label className="ds-label" htmlFor="newPassword">New password</label>
                <div className="relative">
                  <input id="newPassword" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="ds-input pr-20" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">{showPassword ? 'Hide' : 'Show'}</button>
                </div>
                {errors.newPassword && <p className="mt-1 text-xs text-rose-600">{errors.newPassword}</p>}
                <ul className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-600">
                  <li className={checks.min ? 'text-emerald-700' : ''}>• At least 8 characters</li>
                  <li className={checks.lower ? 'text-emerald-700' : ''}>• One lowercase letter</li>
                  <li className={checks.upper ? 'text-emerald-700' : ''}>• One uppercase letter</li>
                  <li className={checks.number ? 'text-emerald-700' : ''}>• One number</li>
                  <li className={checks.special ? 'text-emerald-700' : ''}>• One special character</li>
                </ul>
              </div>

              <div>
                <label className="ds-label" htmlFor="confirmPassword">Confirm new password</label>
                <div className="relative">
                  <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="ds-input pr-20" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">{showConfirmPassword ? 'Hide' : 'Show'}</button>
                </div>
                {errors.confirmPassword && <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword}</p>}
              </div>

              <button type="submit" disabled={loading} className="ds-btn-primary w-full disabled:opacity-70">
                {loading ? 'Updating password...' : 'Reset Password'}
              </button>
            </form>
          )}

          <p className="text-sm text-slate-600">
            Back to{' '}
            <Link href="/login" className="font-semibold text-slate-900 underline underline-offset-4">login</Link>
          </p>
        </section>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow p-6 text-center text-sm text-gray-600">
            Loading reset form...
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
