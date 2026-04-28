"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import ListingCard, { Listing } from "../../components/ListingCard";
import { API_BASE_URL } from "../../../lib/auth";
import { resolveProductImageSrc } from "../../../lib/image";

type ProductDetail = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  image_url?: string | null;
  seller_id: number;
  category_id?: number | null;
  currency_code?: string | null;
  converted_price?: number | null;
  original_price?: number | null;
};

type ReviewSummary = {
  average_rating: number;
  total_reviews: number;
  reviews: Array<{ rating: number; review_text?: string | null; user_name?: string | null }>;
};

const normalizeListing = (item: any): Listing | null => {
  if (!item || typeof item.id !== "number") return null;
  return {
    id: item.id,
    title: item.title || "Untitled listing",
    description: item.description ?? null,
    price: typeof item.price === "number" ? item.price : Number(item.price || 0),
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
  };
};

async function fetchMe(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Session expired");
  }
  return response.json();
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const productId = Number(params?.id);
  const listingIdFromQuery = Number(searchParams.get("listing"));

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [primaryListing, setPrimaryListing] = useState<Listing | null>(null);
  const [related, setRelated] = useState<Listing[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const [buyBusy, setBuyBusy] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  const currency = product?.currency_code || "INR";
  const displayPrice = product ? (product.converted_price ?? product.price) : 0;
  const imageSrc = useMemo(
    () => resolveProductImageSrc(product?.image_url, API_BASE_URL),
    [product?.image_url],
  );

  const loadPageData = useCallback(async () => {
    if (!Number.isFinite(productId) || Number.isNaN(productId) || productId <= 0) {
      setError("Invalid product ID");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const productRes = await fetch(`${API_BASE_URL}/api/v1/products/${productId}`);
      if (!productRes.ok) {
        throw new Error(productRes.status === 404 ? "Product not found" : "Unable to load product");
      }
      const productData: ProductDetail = await productRes.json();
      setProduct(productData);

      const [listingsRes, reviewsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/listings?listing_type=product&limit=150`),
        fetch(`${API_BASE_URL}/api/v1/reviews/product/${productId}/reviews`),
      ]);

      let normalizedListings: Listing[] = [];
      if (listingsRes.ok) {
        const listingRaw = await listingsRes.json();
        normalizedListings = (Array.isArray(listingRaw) ? listingRaw : [])
          .map((item) => normalizeListing(item))
          .filter((item): item is Listing => item !== null);
      }

      const queryMatchedListing =
        Number.isFinite(listingIdFromQuery) && !Number.isNaN(listingIdFromQuery)
          ? normalizedListings.find((listing) => listing.id === listingIdFromQuery)
          : null;

      const sourceMatchedListing = normalizedListings.find(
        (listing) =>
          (listing.source_type === "product" && listing.source_id === productData.id) || listing.id === productData.id,
      );

      const resolvedPrimary = queryMatchedListing || sourceMatchedListing || null;
      setPrimaryListing(resolvedPrimary);

      const relatedListings = normalizedListings
        .filter((listing) => listing.id !== resolvedPrimary?.id)
        .filter((listing) => listing.seller_id === (resolvedPrimary?.seller_id || productData.seller_id))
        .slice(0, 6);
      setRelated(relatedListings);

      if (reviewsRes.ok) {
        const reviewsData: ReviewSummary = await reviewsRes.json();
        setReviewSummary(reviewsData);
      } else {
        setReviewSummary(null);
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load product";
      setError(message);
      setProduct(null);
      setPrimaryListing(null);
      setRelated([]);
    } finally {
      setLoading(false);
    }
  }, [listingIdFromQuery, productId]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const addToCart = useCallback(async () => {
    if (!product) return false;
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(`/login?next=${encodeURIComponent(`/products/${product.id}`)}`);
      return false;
    }

    setActionError(null);
    setAddBusy(true);
    try {
      const me = await fetchMe(token);
      const response = await fetch(`${API_BASE_URL}/api/v1/carts/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          user_id: me.id,
          product_id: product.id,
          quantity: 1,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to add product to cart");
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cart:changed"));
      }
      toast.success("Added to cart");
      return true;
    } catch (addError) {
      const message = addError instanceof Error ? addError.message : "Unable to add product to cart";
      setActionError(message);
      toast.error(message);
      return false;
    } finally {
      setAddBusy(false);
    }
  }, [product, router]);

  const handleBuyNow = useCallback(async () => {
    if (!product) return;
    setBuyBusy(true);
    const ok = await addToCart();
    if (ok) {
      router.push("/checkout");
    }
    setBuyBusy(false);
  }, [addToCart, product, router]);

  const handleWishlist = useCallback(async () => {
    if (!product) return;
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(`/login?next=${encodeURIComponent(`/products/${product.id}`)}`);
      return;
    }

    setWishlistBusy(true);
    setActionError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/wishlists/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: product.id }),
      });

      if (response.ok) {
        toast.success("Saved to wishlist");
        return;
      }
      if (response.status === 400) {
        toast("Already in wishlist");
        return;
      }
      throw new Error("Unable to save to wishlist");
    } catch (wishlistError) {
      const message = wishlistError instanceof Error ? wishlistError.message : "Unable to save to wishlist";
      setActionError(message);
      toast.error(message);
    } finally {
      setWishlistBusy(false);
    }
  }, [product, router]);

  if (loading) {
    return (
      <div className="app-shell">
        <div className="app-container space-y-5">
          <div className="ds-card grid gap-5 lg:grid-cols-2">
            <div className="aspect-[4/3] animate-pulse rounded-2xl bg-slate-200" />
            <div className="space-y-3">
              <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-slate-200" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-slate-200" />
            </div>
          </div>
          <div className="ds-card">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-11/12 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="app-shell">
        <div className="app-container">
          <div className="ds-card text-center">
            <h1 className="text-xl font-semibold text-slate-900">{error || "Product not found"}</h1>
            <p className="mt-2 text-sm text-slate-600">Please check the product link or retry.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button onClick={loadPageData} className="ds-btn-primary" type="button">
                Retry
              </button>
              <button onClick={() => router.push("/search?type=product")} className="ds-btn-secondary" type="button">
                Browse Products
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-container space-y-5">
        <section className="ds-card grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
              <Image
                src={imageSrc}
                alt={product.name}
                fill
                unoptimized
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              High-quality product photos and details are verified before publishing.
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                Product
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {product.stock > 0 ? "In Stock" : "Out of Stock"}
              </span>
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{product.name}</h1>
              <p className="mt-2 text-sm text-slate-600">
                {product.description?.trim() || "No description added yet."}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Price</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {currency} {displayPrice.toFixed(2)}
              </p>
              {!!product.original_price && product.original_price !== displayPrice && (
                <p className="mt-1 text-sm text-slate-500">Original: ₹{product.original_price.toFixed(2)}</p>
              )}
              <p className="mt-2 text-sm text-slate-600">
                Availability: {product.stock > 0 ? `${product.stock} left` : "Currently unavailable"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Seller: {primaryListing?.seller_business_name || `Store #${primaryListing?.seller_id || product.seller_id}`}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={addToCart}
                disabled={addBusy || product.stock <= 0}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addBusy ? "Adding..." : "Add to Cart"}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={buyBusy || product.stock <= 0}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {buyBusy ? "Preparing..." : "Buy Now"}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/store/${primaryListing?.seller_id || product.seller_id}`)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                View Seller
              </button>
              <button
                type="button"
                onClick={handleWishlist}
                disabled={wishlistBusy}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {wishlistBusy ? "Saving..." : "Save to Wishlist"}
              </button>
            </div>

            {actionError && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{actionError}</p>
            )}
          </div>
        </section>

        <section className="ds-card grid gap-4 sm:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Product Details</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Category: {primaryListing?.category_id ? `#${primaryListing.category_id}` : "Not specified"}</li>
              <li>Delivery: Standard and priority checkout options available</li>
              <li>Location: {primaryListing?.address || "Will be shown during checkout"}</li>
              <li>Product ID: #{product.id}</li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Trust & Clarity</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>• Trusted sellers with transparent listing details</li>
              <li>• Easy ordering in just a few steps</li>
              <li>• Secure checkout and order tracking</li>
              <li>• Responsive support from seller and platform</li>
            </ul>
          </div>
        </section>

        <section className="ds-card">
          <h2 className="text-lg font-semibold text-slate-900">Ratings & Reviews</h2>
          {reviewSummary ? (
            <>
              <p className="mt-2 text-sm text-slate-600">
                ⭐ {reviewSummary.average_rating.toFixed(1)} ({reviewSummary.total_reviews} reviews)
              </p>
              <div className="mt-3 space-y-2">
                {reviewSummary.reviews.slice(0, 3).map((review, index) => (
                  <div key={`${review.user_name || "review"}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-700">{review.user_name || "Verified buyer"}</p>
                    <p className="text-xs text-slate-500">Rating: {review.rating}/5</p>
                    {review.review_text && <p className="mt-1 text-sm text-slate-600">{review.review_text}</p>}
                  </div>
                ))}
                {reviewSummary.total_reviews === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    No reviews yet. Be the first to share feedback.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Ratings are unavailable right now.</p>
          )}
        </section>

        <section className="ds-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Similar Listings</h2>
            <button
              type="button"
              onClick={() => router.push("/search?type=product")}
              className="text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              View more
            </button>
          </div>
          {related.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              No similar listings available yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {related.map((listing) => (
                <ListingCard key={`related-${listing.id}`} listing={listing} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}