import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "leaflet/dist/leaflet.css";
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
};

export const viewport: Viewport = {
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