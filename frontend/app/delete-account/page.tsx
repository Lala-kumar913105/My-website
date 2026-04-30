import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Delete Account | Zivolf",
  description:
    "Learn how to request deletion of your Zivolf account and understand what happens to your data.",
};

const sections = [
  {
    title: "Before You Delete",
    points: [
      "Please review your recent orders, active bookings, refunds, and support conversations before requesting deletion.",
      "Aap chahein to important invoices/screenshots pehle save kar sakte hain for future records.",
      "If you are a seller or service provider, make sure pending deliveries or bookings are handled first.",
    ],
  },
  {
    title: "What Will Be Deleted",
    points: [
      "Your Zivolf account profile information and app access credentials.",
      "Saved preferences linked directly to your account, such as profile-level personalization.",
      "Certain account-associated content that can be removed under platform policy and applicable law.",
    ],
  },
  {
    title: "What May Be Retained",
    points: [
      "Some records may be retained for legal compliance, fraud prevention, payment reconciliation, dispute handling, and security monitoring.",
      "Retention may include limited order, booking, payment, audit, or risk-control logs as required by law/policy.",
      "Where retention is required, we keep only necessary data for the required period.",
    ],
  },
  {
    title: "Orders, Bookings and Payments",
    points: [
      "Open orders/bookings may need to be completed, cancelled, or resolved before full deletion processing.",
      "Payment-related records may remain in secure systems for accounting and regulatory obligations.",
      "Refund/dispute timelines can affect final deletion completion.",
    ],
  },
  {
    title: "Seller Account Data",
    points: [
      "Seller listings, operational records, payout references, and compliance logs may be handled under marketplace policy.",
      "Public marketplace transparency records (for example, completed transaction history references) may be preserved in limited form.",
      "If you run an active seller profile, please settle pending obligations before deletion request approval.",
    ],
  },
  {
    title: "How to Request Account Deletion",
    points: [
      "If available, open Account/Profile Settings and use the Delete Account option.",
      "If that button is not available, contact support and request deletion manually.",
      "Include your registered email; reason is optional but helpful for faster assistance.",
    ],
  },
  {
    title: "Account Deletion Timeline",
    points: [
      "After request verification, processing usually starts promptly and may vary based on active transactions or compliance checks.",
      "Some deletion steps can complete quickly, while legally required retention categories continue only for mandated periods.",
      "You may receive confirmation updates through official Zivolf support channels.",
    ],
  },
  {
    title: "Cancel Deletion Request",
    points: [
      "If your request is still under review/processing, contact support immediately to check cancellation feasibility.",
      "Once deletion reaches an irreversible stage, account restoration may not be possible.",
      "For safety, always mention your registered email while communicating with support.",
    ],
  },
  {
    title: "Contact Support",
    points: [
      "Use official Zivolf support channels from the app/website profile area.",
      "Share registered email and any relevant context (optional reason, active orders/bookings) to speed up handling.",
      "For security, never share OTP/password with anyone.",
    ],
  },
];

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-24">
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_70px_-28px_rgba(15,23,42,0.35)]">
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-10 text-white sm:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">Account & Data Control</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">Delete Your Zivolf Account</h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-200 sm:text-base">
              This page explains how account deletion works on <span className="font-semibold">Zivolf</span> in clear and simple
              language. Simple samajh: aap deletion request raise kar sakte hain, and we guide what happens to your data.
            </p>
          </div>

          <div className="grid gap-4 bg-white p-4 sm:gap-5 sm:p-6 lg:p-8">
            {sections.map((section, index) => (
              <article
                key={section.title}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm transition hover:border-slate-300 hover:bg-white"
              >
                <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                  <span className="mr-2 text-slate-400">{String(index + 1).padStart(2, "0")}.</span>
                  {section.title}
                </h2>
                <ul className="mt-3 space-y-2">
                  {section.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm leading-7 text-slate-700 sm:text-[15px]">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden="true" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">Need help with account deletion request? We are here to help you safely.</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400"
                >
                  Go to Profile
                </Link>
                <Link
                  href="/privacy-policy"
                  className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-800 transition hover:border-indigo-300"
                >
                  Read Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}