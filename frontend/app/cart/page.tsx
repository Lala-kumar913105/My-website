"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "../../lib/auth";
import { FALLBACK_PRODUCT_IMAGE, resolveProductImageSrc } from "../../lib/image";

interface Seller {
  id: number;
  business_name: string;
}

interface Product {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
}

interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  product?: Product;
  seller?: Seller | null;
}

interface Cart {
  id: number;
  user_id: number;
  items: CartItem[];
}

export default function CartPage() {
  const router = useRouter();
  const API = API_BASE_URL;
  const [cart, setCart] = useState<Cart | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem("token");
    router.push("/login?next=%2Fcart");
  }, [router]);

  const fetchCart = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");

      const profileResponse = await fetch(`${API}/api/v1/users/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });
      if (!profileResponse.ok) {
        if (profileResponse.status === 401) {
          handleUnauthorized();
          return;
        }
        throw new Error("Unable to verify session");
      }

      const profile = await profileResponse.json();
      setUserId(profile.id);

      const cartResponse = await fetch(`${API}/api/v1/carts/${profile.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });
      if (!cartResponse.ok) {
        if (cartResponse.status === 401) {
          handleUnauthorized();
          return;
        }
        throw new Error("Unable to load cart");
      }

      const cartData: Cart = await cartResponse.json();
      setCart(cartData);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load cart");
    } finally {
      setLoading(false);
    }
  }, [API, handleUnauthorized, router]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const itemCount = useMemo(
    () => (cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0),
    [cart],
  );
  const subtotal = useMemo(
    () => (cart ? cart.items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0) : 0),
    [cart],
  );

  const updateQuantity = async (item: CartItem, nextQuantity: number) => {
    if (!userId || !cart || nextQuantity < 1) return;
    setBusyItemId(item.id);
    setError(null);

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${API}/api/v1/carts/items/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ quantity: nextQuantity }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.detail || "Unable to update quantity");
      }

      setCart({
        ...cart,
        items: cart.items.map((cartItem) =>
          cartItem.id === item.id ? { ...cartItem, quantity: nextQuantity } : cartItem,
        ),
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cart:changed"));
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update quantity");
    } finally {
      setBusyItemId(null);
    }
  };

  const removeItem = async (item: CartItem) => {
    if (!userId || !cart) return;
    setBusyItemId(item.id);
    setError(null);

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${API}/api/v1/carts/remove`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ user_id: userId, item_id: item.id }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.detail || "Unable to remove item");
      }

      setCart({ ...cart, items: cart.items.filter((cartItem) => cartItem.id !== item.id) });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cart:changed"));
      }
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove item");
    } finally {
      setBusyItemId(null);
    }
  };

  if (loading) {
    return (
      <div className="app-shell">
        <div className="app-container space-y-4">
          <div className="ds-card h-24 animate-pulse bg-slate-200" />
          <div className="ds-card h-28 animate-pulse bg-slate-200" />
          <div className="ds-card h-28 animate-pulse bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error && !cart) {
    return (
      <div className="app-shell">
        <div className="app-container">
          <section className="ds-card text-center">
            <h1 className="text-xl font-semibold text-slate-900">Unable to load cart</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <button onClick={fetchCart} className="ds-btn-primary mt-5" type="button">
              Retry
            </button>
          </section>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="app-shell">
        <div className="app-container">
          <section className="ds-card text-center">
            <h1 className="text-2xl font-semibold text-slate-900">Your Cart</h1>
            <p className="mt-2 text-sm text-slate-600">No items yet. Continue shopping to add products.</p>
            <button onClick={() => router.push("/search?type=product")} className="ds-btn-primary mt-5" type="button">
              Continue Shopping
            </button>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-container space-y-5">
        <section className="ds-hero-card">
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Your Cart</h1>
          <p className="mt-2 text-sm text-slate-600">Review your selected items before checkout.</p>
        </section>

        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
          <section className="space-y-3">
            {cart.items.map((item) => {
              const product = item.product;
              const subtotalPrice = (product?.price || 0) * item.quantity;
              const isBusy = busyItemId === item.id;

              return (
                <article key={item.id} className="ds-card space-y-3">
                  <div className="flex gap-3">
                    <img
                      src={resolveProductImageSrc(product?.image_url, API)}
                      alt={product?.name || "Product"}
                      className="h-20 w-20 rounded-xl object-cover"
                      onError={(event) => {
                        event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-1 text-base font-semibold text-slate-900">{product?.name || "Product"}</h3>
                      <p className="line-clamp-2 text-sm text-slate-600">
                        {product?.description?.trim() || "No additional details available."}
                      </p>
                      {item.seller?.business_name && (
                        <p className="mt-1 text-xs text-slate-500">Seller: {item.seller.business_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-slate-600">Price: ₹{(product?.price || 0).toFixed(2)}</p>
                    <p className="text-base font-semibold text-slate-900">Subtotal: ₹{subtotalPrice.toFixed(2)}</p>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center rounded-xl border border-slate-200">
                      <button
                        type="button"
                        disabled={item.quantity <= 1 || isBusy}
                        onClick={() => updateQuantity(item, item.quantity - 1)}
                        className="px-3 py-2 text-lg text-slate-700 disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="min-w-10 px-2 text-center text-sm font-semibold text-slate-900">{item.quantity}</span>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => updateQuantity(item, item.quantity + 1)}
                        className="px-3 py-2 text-lg text-slate-700 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => removeItem(item)}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="ds-card h-fit">
            <h2 className="text-lg font-semibold text-slate-900">Order Summary</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Items total ({itemCount})</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Delivery</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-slate-900">
                <span>Grand total</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <button
                onClick={() => {
                  setCheckoutLoading(true);
                  router.push("/checkout");
                }}
                disabled={checkoutLoading}
                className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                type="button"
              >
                {checkoutLoading ? "Proceeding..." : "Proceed to Checkout"}
              </button>
              <button
                onClick={() => router.push("/search?type=product")}
                className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                type="button"
              >
                Continue Shopping
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}