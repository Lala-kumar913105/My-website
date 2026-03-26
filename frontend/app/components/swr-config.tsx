"use client";

import { PropsWithChildren } from "react";
import { SWRConfig } from "swr";

const fetcher = async (resource: string, init?: RequestInit) => {
  const response = await fetch(resource, init);
  if (!response.ok) {
    throw new Error("Request failed");
  }
  return response.json();
};

export default function SWRConfigProvider({ children }: PropsWithChildren) {
  return (
    <SWRConfig
      value={{
        fetcher,
        dedupingInterval: 30000,
        revalidateOnFocus: false,
        revalidateIfStale: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}