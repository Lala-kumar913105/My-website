"use client";

import dynamic from "next/dynamic";
import { PropsWithChildren } from "react";

const PwaClientProvider = dynamic(() => import("@/app/components/PwaClientProvider"), { ssr: false });
const BottomNav = dynamic(() => import("@/app/components/BottomNav"), { ssr: false });

export default function ClientShell({ children }: PropsWithChildren) {
  return (
    <>
      <PwaClientProvider />
      {children}
      <BottomNav />
    </>
  );
}