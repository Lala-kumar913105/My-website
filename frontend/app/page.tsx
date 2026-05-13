"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ListingCard, { Listing } from "./components/ListingCard";
import type { CategoryItem } from "./components/CategoryRow";
import { API_BASE_URL, getValidLegacyToken, hasAuthCookieFromDocument } from "../lib/auth";

type GeoState = "idle" | "loading" | "ready" | "denied" | "unsupported";

const quickActions = [
  { label: "Shop Products", icon: "🛍️", href: "/search?type=product" },
  { label: "Book Services", icon: "🛠️", href: "/search?type=service" },
  { label: "AI Assistant", icon: "🧠", href: "/assistant" },
  { label: "Social Feed", icon: "🌐", href: "/social-feed" },
  { label: "My Orders", icon: "📦", href: "/my-orders" },
];

const toRad = (value: number) => (value * Math.PI) / 180;

const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const normalizeListing = (item: any): Listing | null => {
  if (!item || typeof item.id !== "number") return null;

  return {
    id: item.id,
    title: item.title || item.name || "Untitled listing",
    description: item.description ?? null,
    price: typeof item.price === "number" ? item.price : Number(item.price || 0),
    type: item.type || item.source_type || "product",
    stock: typeof item.stock === "number" ? item.stock : null,
    duration_minutes: typeof item.duration_minutes === "number" ? item.duration_minutes : null,
    seller_id: typeof item.seller_id === "number" ? item.seller_id : 0,
    image_url: item.image_url ?? null,
    source_id: typeof item.source_id === "number" ? item.source_id : item.id,
    source_type: item.source_type ?? item.type ?? "product",
    category_id: typeof item.category_id === "number" ? item.category_id : null,
    seller_business_name: item.seller_business_name ?? null,
    seller_rating: typeof item.seller_rating === "number" ? item.seller_rating : null,
    address: item.address ?? null,
    latitude: typeof item.latitude === "number" ? item.latitude : null,
    longitude: typeof item.longitude === "number" ? item.longitude : null,
  };
};

function ListingSection({
  title,
  subtitle,
  isLoading,
  error,
  emptyTitle,
  emptyText,
  listings,
  onRetry,
}: {
  title?: string;
  subtitle?: string;
  isLoading: boolean;
  error: string | null;
  emptyTitle: string;
  emptyText: string;
  listings: Listing[];
  onRetry?: () => void;
}) {
  return (
    <section className="ds-card">
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h2 className="ds-title">{title}</h2>}
          {subtitle && <p className="ds-subtitle">{subtitle}</p>}
        </div>
      )}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
          <p className="text-sm font-medium text-rose-700">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="ds-btn-danger mt-3"
            >
              Retry
            </button>
          )}
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`${title}-skeleton-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center">
          <p className="text-base font-semibold text-slate-800">{emptyTitle}</p>
          <p className="mt-2 text-sm text-slate-600">{emptyText}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={`${title}-${listing.id}`} listing={listing} />
          ))}
        </div>
      )}
    </section>
  );
}

function HomeContent() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [listings, setListings] = useState<Listing[]>([]);
  const [isListingsLoading, setIsListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);

  const [recommendedForYou, setRecommendedForYou] = useState<Listing[]>([]);
  const [isRecommendedLoading, setIsRecommendedLoading] = useState(false);
  const [recommendedError, setRecommendedError] = useState<string | null>(null);

  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchCategories = async () => {
    setIsCategoriesLoading(true);
    setCategoriesError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/categories?is_active=true&limit=200`);
      if (!response.ok) {
        throw new Error("Unable to fetch categories");
      }

      const data: CategoryItem[] = await response.json();
      setCategories(Array.isArray(data) ? data.filter((category) => !category.parent_id) : []);
    } catch (error) {
      console.error(error);
      setCategories([]);
      setCategoriesError("Categories are unavailable right now.");
    } finally {
      setIsCategoriesLoading(false);
    }
  };

  const fetchListings = async () => {
    setIsListingsLoading(true);
    setListingsError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/listings?limit=120`);
      if (!response.ok) {
        throw new Error("Unable to load home listings");
      }

      const data = await response.json();
      const normalized = (Array.isArray(data) ? data : [])
        .map((item) => normalizeListing(item))
        .filter((item): item is Listing => item !== null);

      setListings(normalized);
    } catch (error) {
      console.error(error);
      setListings([]);
      setListingsError("We couldn't load listings. Please retry.");
    } finally {
      setIsListingsLoading(false);
    }
  };

  const fetchPersonalizedData = async () => {
    const token = getValidLegacyToken();
    if (!token) {
      setRecommendedForYou([]);
      setRecommendedError(null);
      return;
    }

    setIsRecommendedLoading(true);
    setRecommendedError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/recommendations/products?limit=6`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          setRecommendedForYou([]);
          setRecommendedError(null);
          return;
        }
        throw new Error("Unable to fetch personalized products");
      }

      const data = await response.json();
      const normalized = (Array.isArray(data) ? data : [])
        .map((item) => normalizeListing({ ...item, type: "product", source_type: "product" }))
        .filter((item): item is Listing => item !== null);

      setRecommendedForYou(normalized);
    } catch (error) {
      console.error(error);
      setRecommendedForYou([]);
      setRecommendedError("Personalized recommendations are unavailable now.");
    } finally {
      setIsRecommendedLoading(false);
    }
  };

  const fetchUserRole = async () => {
    const token = getValidLegacyToken();
    if (!token && !hasAuthCookieFromDocument()) {
      setUserRole(null);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });

      if (response.ok) {
        const profile = await response.json();
        setUserRole(profile?.role || null);
      } else if (response.status === 401) {
        localStorage.removeItem("token");
        setUserRole(null);
      }
    } catch (error) {
      console.error(error);
      setUserRole(null);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoState("unsupported");
      return;
    }

    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGeoState("ready");
      },
      () => {
        setUserCoords(null);
        setGeoState("denied");
      },
      { enableHighAccuracy: false, timeout: 7000 },
    );
  };

  useEffect(() => {
    fetchCategories();
    fetchListings();
    fetchPersonalizedData();
    fetchUserRole();
  }, []);

  const featuredProducts = useMemo(() => listings.filter((item) => item.type === "product").slice(0, 6), [listings]);
  const popularServices = useMemo(() => listings.filter((item) => item.type === "service").slice(0, 6), [listings]);

  const trendingSellers = useMemo(() => {
    const sellerMap = new Map<number, { sellerId: number; name: string; count: number; rating: number | null }>();

    listings.forEach((item) => {
      if (!item.seller_id) return;
      const existing = sellerMap.get(item.seller_id);
      const rating = typeof item.seller_rating === "number" ? item.seller_rating : null;

      if (existing) {
        existing.count += 1;
        if (rating !== null) {
          existing.rating = existing.rating === null ? rating : Math.max(existing.rating, rating);
        }
      } else {
        sellerMap.set(item.seller_id, {
          sellerId: item.seller_id,
          name: item.seller_business_name?.trim() || `Seller #${item.seller_id}`,
          count: 1,
          rating,
        });
      }
    });

    return Array.from(sellerMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [listings]);

  const nearbyServices = useMemo(() => {
    if (!userCoords) return [];

    return listings
      .filter(
        (item) =>
          item.type === "service" && typeof item.latitude === "number" && typeof item.longitude === "number",
      )
      .map((item) => ({
        listing: item,
        distance: getDistanceKm(userCoords.latitude, userCoords.longitude, item.latitude as number, item.longitude as number),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 6)
      .map((item) => item.listing);
  }, [listings, userCoords]);

  const handleSearchSubmit = () => {
    const trimmed = searchText.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  };

  const sellerAction = userRole === "seller"
    ? { label: "Seller Dashboard", icon: "🏪", href: "/seller-dashboard" }
    : { label: "Become Seller", icon: "🚀", href: "/seller-dashboard" };

  return (
    <div className="app-shell">
      <main className="app-container space-y-4">
        <section className="ds-hero-card">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Marketplace Super App</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Buy Products. Book Services. All in One Place.
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Discover trusted sellers, useful services, and everything you need in one platform.
          </p>

          <div className="ds-input-shell mt-5">
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-slate-400">
                🔍
              </span>
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearchSubmit();
                }}
                placeholder="Search products, services, or sellers..."
                className="h-10 w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
              {searchText && (
                <button type="button" onClick={() => setSearchText("")} className="rounded-full px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200">
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSearchSubmit}
              className="ds-btn-primary"
            >
              Explore Now
            </button>
            <button
              type="button"
              onClick={() => router.push("/search")}
              className="ds-btn-secondary"
            >
              Browse All Listings
            </button>
          </div>
        </section>

        <section className="ds-card">
          <h2 className="ds-title">Quick Actions</h2>
          <p className="ds-subtitle">Jump into key sections in one tap.</p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[...quickActions, sellerAction].map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => router.push(action.href)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-slate-300 hover:bg-white"
              >
                <span className="block text-lg">{action.icon}</span>
                <span className="mt-1 block text-xs font-semibold text-slate-700">{action.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="ds-card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="ds-title">Browse Categories</h2>
            {categoriesError && <span className="text-xs text-rose-600">{categoriesError}</span>}
          </div>

          {isCategoriesLoading ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={`home-category-skeleton-${index}`} className="h-9 min-w-24 animate-pulse rounded-full bg-slate-200" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="text-sm font-semibold text-slate-800">No categories available yet.</p>
              <p className="mt-1 text-sm text-slate-600">Once categories are added, you will find them here.</p>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    router.push(
                      `/search?category=${category.id}&type=${category.type === "service" ? "service" : "product"}`,
                    )
                  }
                  className="ds-chip"
                >
                  {category.icon ? `${category.icon} ` : ""}
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </section>

        <ListingSection
          title="Featured Products"
          subtitle="Popular products from trusted sellers"
          isLoading={isListingsLoading}
          error={listingsError}
          onRetry={fetchListings}
          listings={featuredProducts}
          emptyTitle="No featured products yet"
          emptyText="Sellers are adding fresh inventory. Check back soon."
        />

        <ListingSection
          title="Popular Services"
          subtitle="Book quality services in minutes"
          isLoading={isListingsLoading}
          error={listingsError}
          onRetry={fetchListings}
          listings={popularServices}
          emptyTitle="No services listed right now"
          emptyText="Service providers will appear here once available."
        />

        <ListingSection
          title="Recommended for You"
          subtitle="Personalized picks based on your activity"
          isLoading={isRecommendedLoading}
          error={recommendedError}
          onRetry={fetchPersonalizedData}
          listings={recommendedForYou}
          emptyTitle="No personalized recommendations yet"
          emptyText="Explore listings to help us tailor suggestions for you."
        />

        <section className="ds-card">
          <div className="mb-4">
            <h2 className="ds-title">Trending Sellers</h2>
            <p className="ds-subtitle">Sellers with the most active listings on the platform.</p>
          </div>

          {isListingsLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`seller-skeleton-${index}`} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
              ))}
            </div>
          ) : trendingSellers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center">
              <p className="text-base font-semibold text-slate-800">No seller trends available yet</p>
              <p className="mt-2 text-sm text-slate-600">Top sellers will appear once listings and activity increase.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {trendingSellers.map((seller) => (
                <button
                  key={seller.sellerId}
                  type="button"
                  onClick={() => router.push(`/store/${seller.sellerId}`)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white"
                >
                  <p className="line-clamp-1 text-sm font-semibold text-slate-900">{seller.name}</p>
                  <p className="mt-1 text-xs text-slate-600">{seller.count} active listings</p>
                  <p className="mt-2 text-xs font-medium text-slate-700">
                    {seller.rating !== null ? `⭐ ${seller.rating.toFixed(1)} rating` : "New seller"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="ds-card">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="ds-title">Nearby Services</h2>
              <p className="ds-subtitle">Enable location for faster and closer service discovery.</p>
            </div>
            {geoState !== "ready" && (
              <button
                type="button"
                onClick={requestLocation}
                className="ds-btn-secondary"
              >
                {geoState === "loading" ? "Detecting..." : "Use My Location"}
              </button>
            )}
          </div>

          {geoState === "denied" && (
            <p className="mb-4 text-sm text-amber-700">Location permission is off. Enable it to see nearest services.</p>
          )}
          {geoState === "unsupported" && (
            <p className="mb-4 text-sm text-amber-700">Location is not supported on this device/browser.</p>
          )}

          <ListingSection
            title=""
            subtitle=""
            isLoading={isListingsLoading || geoState === "loading"}
            error={listingsError}
            onRetry={fetchListings}
            listings={nearbyServices}
            emptyTitle="No nearby services available"
            emptyText="Try again later or browse all services from search."
          />
        </section>

        <section className="ds-card">
          <h2 className="ds-title">Why users trust Zivolf</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Trusted sellers", text: "Verified businesses and reliable quality" },
              { title: "Easy booking", text: "Book services in a few quick steps" },
              { title: "Fast shopping", text: "Discover and buy products instantly" },
              { title: "Secure experience", text: "Safe flows for orders, AI Assistant, and profile" },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}