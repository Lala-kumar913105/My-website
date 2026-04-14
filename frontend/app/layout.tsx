import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SWRConfigProvider from "./components/swr-config";
import { I18nProvider } from "./i18n/context";
import { Toaster } from "react-hot-toast";
import ClientShell from "./components/client-shell";

const inter = Inter({
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
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
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