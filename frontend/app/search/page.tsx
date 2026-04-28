"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ListingCard, { Listing } from "../components/ListingCard";
import { API_BASE_URL } from "../../lib/auth";
import type { CategoryItem } from "../components/CategoryRow";

type ListingTypeFilter = "all" | "product" | "service";
type SmartFilter = "default" | "nearby" | "price_asc" | "price_desc" | "top_rated" | "available_now";

const TYPE_TOGGLES: Array<{ label: string; value: ListingTypeFilter }> = [
  { label: "All", value: "all" },
  { label: "Products", value: "product" },
  { label: "Services", value: "service" },
];

const SMART_FILTERS: Array<{ label: string; value: SmartFilter }> = [
  { label: "Nearby", value: "nearby" },
  { label: "Low to High", value: "price_asc" },
  { label: "High to Low", value: "price_desc" },
  { label: "Top Rated", value: "top_rated" },
  { label: "Available Now", value: "available_now" },
];

type ListingWithDistance = Listing & { __distanceKm?: number | null };

const toRad = (value: number) => (value * Math.PI) / 180;

const getDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const mapTypeFromQuery = (rawType: string | null): ListingTypeFilter => {
  if (rawType === "products") return "product";
  if (rawType === "services") return "service";
  if (rawType === "product" || rawType === "service" || rawType === "all") return rawType;
  return "all";
};

function SearchContent() {
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [selectedType, setSelectedType] = useState<ListingTypeFilter>(mapTypeFromQuery(searchParams.get("type")));
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    searchParams.get("category") ? Number(searchParams.get("category")) : null,
  );
  const [smartFilter, setSmartFilter] = useState<SmartFilter>("default");

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [listings, setListings] = useState<ListingWithDistance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    document.title = "Search Products & Services";
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (smartFilter !== "nearby") return;
    if (userCoords) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setUserCoords(null);
      },
      { enableHighAccuracy: false, timeout: 7000 },
    );
  }, [smartFilter, userCoords]);

  const fetchCategories = async () => {
    setIsCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/categories?is_active=true&limit=200`);
      if (!res.ok) {
        throw new Error("Failed to load categories");
      }
      const data: CategoryItem[] = await res.json();
      setCategories(Array.isArray(data) ? data.filter((category) => !category.parent_id) : []);
    } catch (fetchError) {
      console.error(fetchError);
      setCategories([]);
      setCategoriesError("Unable to load categories right now.");
    } finally {
      setIsCategoriesLoading(false);
    }
  };

  const fetchListings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", "120");

      if (selectedType !== "all") {
        params.set("listing_type", selectedType);
      }

      if (selectedCategoryId) {
        params.set("category_id", String(selectedCategoryId));
      }

      if (debouncedQuery) {
        params.set("q", debouncedQuery);
      }

      if (["price_asc", "price_desc", "top_rated"].includes(smartFilter)) {
        params.set("sort_by", smartFilter);
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/listings?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Unable to load results");
      }

      const rawData = await response.json();
      const normalized: ListingWithDistance[] = (Array.isArray(rawData) ? rawData : [])
        .filter((item) => item && typeof item.id === "number")
        .map((item): ListingWithDistance => ({
          id: item.id,
          title: item.title || "Untitled listing",
          description: item.description ?? null,
          price: typeof item.price === "number" ? item.price : 0,
          type: item.type || "product",
          stock: typeof item.stock === "number" ? item.stock : null,
          duration_minutes: typeof item.duration_minutes === "number" ? item.duration_minutes : null,
          seller_id: typeof item.seller_id === "number" ? item.seller_id : 0,
          image_url: item.image_url ?? null,
          source_id: typeof item.source_id === "number" ? item.source_id : null,
          source_type: item.source_type ?? null,
          category_id: typeof item.category_id === "number" ? item.category_id : null,
          seller_business_name: item.seller_business_name ?? null,
          seller_rating: typeof item.seller_rating === "number" ? item.seller_rating : null,
          address: item.address ?? null,
          latitude: typeof item.latitude === "number" ? item.latitude : null,
          longitude: typeof item.longitude === "number" ? item.longitude : null,
        }));

      let enhanced = [...normalized];

      if (smartFilter === "available_now") {
        enhanced = enhanced.filter((item) => item.type !== "product" || (item.stock ?? 0) > 0);
      }

      if (smartFilter === "nearby" && userCoords) {
        enhanced = enhanced
          .map((item) => {
            if (typeof item.latitude !== "number" || typeof item.longitude !== "number") {
              return { ...item, __distanceKm: null };
            }

            return {
              ...item,
              __distanceKm: getDistanceKm(
                userCoords.latitude,
                userCoords.longitude,
                item.latitude,
                item.longitude,
              ),
            };
          })
          .sort((a, b) => {
            if (a.__distanceKm == null && b.__distanceKm == null) return 0;
            if (a.__distanceKm == null) return 1;
            if (b.__distanceKm == null) return -1;
            return a.__distanceKm - b.__distanceKm;
          });
      }

      setListings(enhanced);
    } catch (fetchError) {
      console.error(fetchError);
      setError("We couldn't load results right now. Please retry.");
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, selectedCategoryId, debouncedQuery, smartFilter, userCoords?.latitude, userCoords?.longitude]);

  const visibleCategories = useMemo(() => {
    if (selectedType === "all") return categories;
    if (selectedType === "product") return categories.filter((category) => category.type !== "service");
    return categories.filter((category) => category.type === "service");
  }, [categories, selectedType]);

  const isDefaultView =
    !debouncedQuery &&
    !selectedCategoryId &&
    selectedType === "all" &&
    smartFilter === "default";

  const selectedCategoryName =
    categories.find((category) => category.id === selectedCategoryId)?.name || null;

  const resultSummary = useMemo(() => {
    if (smartFilter === "nearby" && userCoords) {
      return listings.length > 0
        ? `Showing ${listings.length} nearby results`
        : "No nearby results found";
    }

    if (listings.length === 1) {
      return "1 result found";
    }

    return `${listings.length} results found`;
  }, [listings.length, smartFilter, userCoords]);

  return (
    <div className="app-shell">
      <div className="app-container">
        <section className="ds-hero-card">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Search Products & Services
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Find products, services, and trusted sellers near you
          </p>

          <div className="ds-input-shell mt-5">
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-slate-400">
                🔍
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search for products, services, or sellers..."
                className="h-10 w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded-full px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-200"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="ds-segment mt-4">
            {TYPE_TOGGLES.map((toggle) => (
              <button
                key={toggle.value}
                type="button"
                onClick={() => {
                  setSelectedType(toggle.value);
                  setSelectedCategoryId(null);
                }}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${
                  selectedType === toggle.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {toggle.label}
              </button>
            ))}
          </div>
        </section>

        <section className="ds-card mt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="ds-title">Categories</h2>
            {categoriesError && <span className="text-xs text-rose-600">{categoriesError}</span>}
          </div>

          {isCategoriesLoading ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={`category-skeleton-${index}`}
                  className="h-9 min-w-24 animate-pulse rounded-full bg-slate-200"
                />
              ))}
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setSelectedCategoryId(null)}
                className={`ds-chip ${
                  selectedCategoryId === null
                    ? "ds-chip-active"
                    : ""
                }`}
              >
                All categories
              </button>

              {visibleCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`ds-chip ${
                    selectedCategoryId === category.id
                      ? "ds-chip-active"
                      : ""
                  }`}
                >
                  {category.icon ? `${category.icon} ` : ""}
                  {category.name}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setSmartFilter("default")}
              className={`ds-chip-soft ${
                smartFilter === "default"
                  ? "ds-chip-soft-active"
                  : ""
              }`}
            >
              Default
            </button>

            {SMART_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setSmartFilter(filter.value)}
                className={`ds-chip-soft ${
                  smartFilter === filter.value
                    ? "ds-chip-soft-active"
                    : ""
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        <section className="ds-card mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-700">{resultSummary}</p>
            <div className="text-xs text-slate-500">
              Type: {selectedType === "all" ? "All" : selectedType === "product" ? "Products" : "Services"}
              {selectedCategoryName ? ` • ${selectedCategoryName}` : ""}
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
              <p className="text-sm font-medium text-rose-700">{error}</p>
              <button
                type="button"
                onClick={fetchListings}
                className="ds-btn-danger mt-3"
              >
                Retry
              </button>
            </div>
          ) : isLoading ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`listing-skeleton-${index}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="aspect-[4/3] animate-pulse bg-slate-200" />
                  <div className="space-y-2 p-4">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200" />
                    <div className="h-9 w-full animate-pulse rounded-xl bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-lg font-semibold text-slate-800">
                {isDefaultView ? "No listings available yet" : "No results found"}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {isDefaultView
                  ? "Once sellers add products and services, they will appear here."
                  : "Try changing your search text or filters."}
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
