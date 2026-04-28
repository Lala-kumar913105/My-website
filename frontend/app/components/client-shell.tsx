"use client";

import dynamic from "next/dynamic";
import { PropsWithChildren } from "react";

const PwaClientProvider = dynamic(() => import("./PwaClientProvider"), { ssr: false });
const BottomNav = dynamic(() => import("./BottomNav"), { ssr: false });
const TopHeader = dynamic(() => import("./TopHeader"), { ssr: false });

export default function ClientShell({ children }: PropsWithChildren) {
  return (
    <>
      <PwaClientProvider />
      <TopHeader />
      {children}
      <BottomNav />
    </>
  );
}