import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import './globals.css';
import SWRConfigProvider from '@/app/components/swr-config';
import { I18nProvider } from "@/app/i18n/context";
import { Toaster } from "react-hot-toast";
import ClientShell from "@/app/components/client-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EcomEase Super App",
  description: "Marketplace + service booking super app",
  manifest: "/manifest.json",
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider>
          <SWRConfigProvider>
            <ClientShell>
              {children}
              <Toaster position="top-right" />
            </ClientShell>
          </SWRConfigProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
