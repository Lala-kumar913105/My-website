"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/app/i18n/context";
import ListingCard, { Listing } from "@/app/components/ListingCard";

function ServicesContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = useMemo(() => searchParams.get("category"), [searchParams]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchListings = async () => {
      setIsLoading(true);
      try {
        const endpoint = `${API}/api/v1/listings?listing_type=service`;

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data: Listing[] = await response.json();
          setListings(data);
        } else if (response.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
        } else {
          console.error("Failed to fetch services");
        }
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchListings();
  }, [categoryId, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("home.services") !== "home.services" ? t("home.services") : "Services"}
          </h1>
          {categoryId && (
            <span className="text-sm text-gray-500">Category #{categoryId}</span>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-600">
              {t("home.loading") !== "home.loading" ? t("home.loading") : "Loading services..."}
            </p>
          </div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">
              {t("home.noServices") !== "home.noServices" ? t("home.noServices") : "No services available."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ServicesContent />
    </Suspense>
  );
}