import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Zivolf",
  description: "Read how Zivolf collects, uses, protects, and manages user data.",
};

const sections = [
  {
    title: "Introduction",
    content:
      "Welcome to Zivolf (https://www.zivolf.com). We are an e-commerce and service-booking marketplace where users can buy products, book services, and grow as sellers or service providers. This Privacy Policy explains what data we collect, why we collect it, and how we protect it. Simple words: your trust matters to us.",
  },
  {
    title: "Information We Collect",
    content:
      "We may collect your name, email, phone number, delivery or service address, profile details, order and booking details, payment references, product/service preferences, review content, and communication logs. If you use seller features, we may also collect store details, listings, pricing, and operational information.",
  },
  {
    title: "How We Use Your Information",
    content:
      "We use your information to create and manage accounts, process purchases and bookings, coordinate deliveries/services, provide customer support, improve recommendations, detect fraud, and send important updates such as order status, booking confirmations, and security notices.",
  },
  {
    title: "Account and Authentication",
    content:
      "When you create an account, we use your credentials and session data to authenticate you and keep your account secure. We may use secure tokens, login sessions, and account activity checks to reduce unauthorized access.",
  },
  {
    title: "Seller and Service Provider Data",
    content:
      "If you register as a seller/service provider, we collect and process business information, listing details, inventory/service availability, pricing, and performance-related activity (for example, ratings, completion, and response patterns) to operate the marketplace efficiently.",
  },
  {
    title: "Orders, Bookings and Payments",
    content:
      "To complete orders and bookings, we process transaction-related data such as cart items, booking slots, payment status, billing references, and fulfillment updates. Sensitive payment data is handled using secure payment workflows and trusted partners where applicable.",
  },
  {
    title: "Location Information",
    content:
      "For delivery, nearby services, and map-based features, we may use your location or address details. You can control location permissions through your device/browser settings. Turning off location may limit certain features.",
  },
  {
    title: "Cookies and Authentication",
    content:
      "We use cookies and similar technologies for login persistence, session management, preferences, analytics, and security. In easy terms: cookies help keep you signed in and improve your app experience.",
  },
  {
    title: "Data Sharing",
    content:
      "We share data only when necessary: with sellers/service providers for order fulfillment, with logistics or operational partners, with payment and security providers, and when required by law. We do not sell your personal information as a business model.",
  },
  {
    title: "Data Security",
    content:
      "We use administrative, technical, and organizational safeguards to protect your information against unauthorized access, misuse, or loss. No system is 100% risk-free, but we continuously improve controls and monitoring.",
  },
  {
    title: "User Rights",
    content:
      "Depending on your region, you may request access, correction, deletion, portability, or restriction of your personal data. You can also contact us for privacy questions or to raise concerns. We aim to respond within a reasonable timeline.",
  },
  {
    title: "Children’s Privacy",
    content:
      "Zivolf is not intended for children under the age required by applicable law to provide valid consent. We do not knowingly collect personal information from children without legal basis. If such data is identified, we take steps to remove it.",
  },
  {
    title: "Data Retention",
    content:
      "We retain data for as long as needed to provide services, complete transactions, resolve disputes, comply with legal obligations, and enforce marketplace policies. Retention periods vary by data type and legal requirements.",
  },
  {
    title: "Updates to This Policy",
    content:
      "We may update this Privacy Policy from time to time to reflect product changes, legal requirements, or security improvements. Updated versions will be posted on this page with a revised effective date.",
  },
  {
    title: "Contact Us",
    content:
      "For privacy-related support, contact Zivolf through our official support channels on the platform. You may also write to us via the website contact options for requests related to account data, deletion, correction, or security concerns.",
  },
];

export default function PrivacyPolicyPage() {
  const effectiveDate = "30 April 2026";

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-28">
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 px-6 py-10 text-white sm:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">Legal & Privacy</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">Privacy Policy</h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-200 sm:text-base">
              At <span className="font-semibold">Zivolf</span>, we respect your privacy and protect your personal data with care.
              This policy is designed in simple, user-friendly language (easy for both Hindi and English readers) while staying
              professional and legally clear.
            </p>
            <div className="mt-5 inline-flex items-center rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs sm:text-sm">
              Effective date: {effectiveDate}
            </div>
          </div>

          <div className="space-y-4 bg-white p-4 sm:space-y-5 sm:p-6 lg:p-8">
            {sections.map((section, index) => (
              <article
                key={section.title}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-sm transition hover:border-slate-300 hover:bg-white"
              >
                <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                  <span className="mr-2 text-slate-400">{String(index + 1).padStart(2, "0")}.</span>
                  {section.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-700 sm:text-[15px]">{section.content}</p>
              </article>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p>Need additional clarification? We are here to help.</p>
            <Link
              href="/profile"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 font-medium text-slate-800 transition hover:border-slate-400"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
