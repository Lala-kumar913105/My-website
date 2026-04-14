import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import './globals.css';
import SWRConfigProvider from '@/app/components/swr-config';
import { I18nProvider } from "../i18n/context";
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
  title: "Zivolf",
  description: "Zivolf marketplace super app",
  manifest: "/manifest.json",
  themeColor: "#000000",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <link rel="manifest" href="/manifest.json" />
      </head>
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
