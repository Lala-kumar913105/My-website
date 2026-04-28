"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useI18n } from "../i18n/context";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../../lib/auth";
import { FALLBACK_PRODUCT_IMAGE, resolveProductImageSrc } from "../../lib/image";

export interface Listing {
  id: number;
  title: string;
  description?: string | null;
  price: number;
  type: "product" | "service" | string;
  stock?: number | null;
  duration_minutes?: number | null;
  seller_id: number;
  image_url?: string | null;
  category_id?: number | null;
  seller_business_name?: string | null;
  seller_rating?: number | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  source_id?: number | null;
  source_type?: "product" | "service" | string | null;
}

interface ListingCardProps {
  listing: Listing;
  onAddToCart?: (listing: Listing) => Promise<void> | void;
  onQuickAction?: (listing: Listing) => Promise<void> | void;
}

const ListingCard = ({ listing, onAddToCart, onQuickAction }: ListingCardProps) => {
  const router = useRouter();
  const { t } = useI18n();
  const API = API_BASE_URL;
  const isProduct = listing.type === "product";
  const isService = listing.type === "service";
  const sellerName = listing.seller_business_name?.trim() || `Seller #${listing.seller_id}`;
  const initialImageSrc = useMemo(
    () => resolveProductImageSrc(listing.image_url, API),
    [listing.image_url, API],
  );
  const [imageSrc, setImageSrc] = useState(initialImageSrc);

  useEffect(() => {
    setImageSrc(initialImageSrc);
  }, [initialImageSrc]);

  const resolveProductId = () => {
    if (listing.source_type === "product" && typeof listing.source_id === "number") {
      return listing.source_id;
    }

    // Backward compatibility for legacy rows where listing.id mapped directly to product.id.
    return listing.id;
  };

  const buildAuthHeaders = (token: string | null) => {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  };

  const internalAddToCart = async () => {
    const productId = resolveProductId();
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!API) {
      console.error("[AddToCart] Missing API base URL");
      toast.error("API URL is missing");
      return;
    }

    if (!productId || Number.isNaN(productId)) {
      console.error("[AddToCart] Invalid product id", {
        listingId: listing.id,
        sourceId: listing.source_id,
        sourceType: listing.source_type,
      });
      toast.error("Invalid product, please refresh and try again");
      return;
    }

    try {
      console.log("[AddToCart] Start", {
        listingId: listing.id,
        resolvedProductId: productId,
        sourceId: listing.source_id,
        sourceType: listing.source_type,
        hasToken: Boolean(token),
      });

      const profileResponse = await fetch(`${API}/api/v1/users/me`, {
        method: "GET",
        headers: buildAuthHeaders(token),
        credentials: "include",
      });

      if (!profileResponse.ok) {
        if (profileResponse.status === 401) {
          localStorage.removeItem("token");
          toast.error("Please login to add items to cart");
          router.push("/login");
          return;
        }

        const profileError = await profileResponse.text().catch(() => "");
        console.error("[AddToCart] Failed to fetch user profile", {
          status: profileResponse.status,
          body: profileError,
        });
        toast.error("Unable to verify your account. Please try again.");
        return;
      }

      const profile = await profileResponse.json();
      if (!profile?.id) {
        console.error("[AddToCart] Invalid /users/me response", { profile });
        toast.error("Session issue detected. Please login again.");
        router.push("/login");
        return;
      }

      const payload = {
        user_id: profile.id,
        product_id: productId,
        quantity: 1,
      };

      console.log("[AddToCart] Request", {
        endpoint: `${API}/api/v1/carts/add`,
        payload,
      });

      const response = await fetch(`${API}/api/v1/carts/add`, {
        method: "POST",
        headers: buildAuthHeaders(token),
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        console.log("[AddToCart] Success", data);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("cart:changed"));
        }
        toast.success("Added to cart");
        return;
      }

      if (response.status === 401) {
        localStorage.removeItem("token");
        toast.error("Session expired. Please login again.");
        router.push("/login");
        return;
      }

      const errorBody = await response.text().catch(() => "");
      console.error("[AddToCart] Failed", {
        status: response.status,
        body: errorBody,
      });
      toast.error("Failed to add to cart");
    } catch (error) {
      console.error("[AddToCart] Unexpected error", error);
      toast.error("Error adding to cart. Please try again.");
    }
  };

  const handleAddClick = async () => {
    if (onAddToCart) {
      await onAddToCart(listing);
      return;
    }

    await internalAddToCart();
  };

  const formattedPrice = Number.isFinite(listing.price)
    ? `₹${Number(listing.price).toFixed(2)}`
    : "Price unavailable";

  const handlePrimaryAction = async () => {
    if (isProduct) {
      await handleAddClick();
      return;
    }

    onQuickAction?.(listing);
    router.push(`/services/${listing.id}/book?listing=1`);
  };

  const productDetailHref = `/products/${resolveProductId()}?listing=${listing.id}`;
  const serviceBookingHref = `/services/${listing.id}/book?listing=1`;

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <button
        type="button"
        onClick={() => router.push(isProduct ? productDetailHref : serviceBookingHref)}
        className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 text-left"
      >
        <Image
          src={imageSrc}
          alt={listing.title}
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          className="object-cover transition duration-300 group-hover:scale-[1.02]"
          onError={() => setImageSrc(FALLBACK_PRODUCT_IMAGE)}
        />
        {imageSrc === FALLBACK_PRODUCT_IMAGE && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100/90 text-sm font-medium text-slate-500">
            No image available
          </div>
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isProduct
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              : "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
          }`}
        >
          {isProduct ? "Product" : isService ? "Service" : listing.type}
        </span>
      </button>

      <div className="space-y-3 p-4">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => router.push(isProduct ? productDetailHref : serviceBookingHref)}
            className="line-clamp-1 text-left text-base font-semibold text-slate-900 hover:text-slate-700"
          >
            {listing.title}
          </button>
          <p className="line-clamp-2 min-h-10 text-sm text-slate-600">
            {listing.description?.trim() || "No description provided yet."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="text-base font-semibold text-slate-900">{formattedPrice}</span>
          {isProduct && typeof listing.stock === "number" && <span>• Stock {listing.stock}</span>}
          {isService && !!listing.duration_minutes && <span>• {listing.duration_minutes} min</span>}
          {listing.seller_rating !== null && listing.seller_rating !== undefined && (
            <span>• ⭐ {Number(listing.seller_rating).toFixed(1)}</span>
          )}
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <p className="line-clamp-1">Seller: {sellerName}</p>
          {listing.address && <p className="line-clamp-1">Location: {listing.address}</p>}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={handlePrimaryAction}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition ${
              isProduct ? "bg-slate-900 hover:bg-slate-800" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {isProduct
              ? t("home.add") !== "home.add"
                ? t("home.add")
                : "Add to Cart"
              : t("home.bookNow") !== "home.bookNow"
                ? t("home.bookNow")
                : "Book Now"}
          </button>

          <button
            onClick={() => router.push(`/store/${listing.seller_id}`)}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View Seller
          </button>
        </div>
      </div>
    </article>
  );
};

export default ListingCard;