"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, getValidLegacyToken } from "../../lib/auth";
import { FALLBACK_PRODUCT_IMAGE, resolveProductImageSrc } from "../../lib/image";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url?: string | null;
}

interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  product?: Product;
}

interface Cart {
  id: number;
  user_id: number;
  items: CartItem[];
}

interface CoinBalance {
  balance: number;
  badge_label?: string | null;
}

interface CheckoutForm {
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  notes: string;
}

const INITIAL_FORM: CheckoutForm = {
  fullName: "",
  phone: "",
  addressLine: "",
  city: "",
  state: "",
  postalCode: "",
  notes: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const API = API_BASE_URL;

  const [cart, setCart] = useState<Cart | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [deliveryOption, setDeliveryOption] = useState<"standard" | "priority">("standard");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cod">("cod");
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [coinBalance, setCoinBalance] = useState<CoinBalance | null>(null);
  const [useCoins, setUseCoins] = useState(false);
  const [form, setForm] = useState<CheckoutForm>(INITIAL_FORM);

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem("token");
    router.push("/login?next=%2Fcheckout");
  }, [router]);

  const fetchCheckoutData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getValidLegacyToken();

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

      const [cartResponse, coinsResponse] = await Promise.all([
        fetch(`${API}/api/v1/carts/${profile.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: "include",
        }),
        fetch(`${API}/api/v1/coins/balance`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: "include",
        }),
      ]);

      if (!cartResponse.ok) {
        if (cartResponse.status === 401) {
          handleUnauthorized();
          return;
        }
        throw new Error("Unable to load checkout cart");
      }

      const cartData: Cart = await cartResponse.json();
      setCart(cartData);

      if (coinsResponse.ok) {
        const coinsData = await coinsResponse.json();
        setCoinBalance({
          balance: coinsData.balance ?? 0,
          badge_label: coinsData.badge_label,
        });
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load checkout");
    } finally {
      setLoading(false);
    }
  }, [API, handleUnauthorized, router]);

  useEffect(() => {
    fetchCheckoutData();
  }, [fetchCheckoutData]);

  const subtotal = useMemo(
    () => (cart ? cart.items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0) : 0),
    [cart],
  );
  const itemCount = useMemo(
    () => (cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0),
    [cart],
  );
  const deliveryCharge = deliveryOption === "priority" ? 75 : 40;
  const total = Math.max(subtotal + deliveryCharge - discountAmount, 0);

  const validateForm = () => {
    if (!form.fullName.trim()) return "Please enter full name";
    if (!form.phone.trim() || form.phone.trim().length < 8) return "Please enter a valid phone number";
    if (!form.addressLine.trim()) return "Please enter address";
    if (!form.city.trim()) return "Please enter city";
    if (!form.state.trim()) return "Please enter state";
    if (!form.postalCode.trim()) return "Please enter postal code";
    return null;
  };

  const handleCouponApply = async () => {
    setCouponMessage(null);
    setError(null);

    if (!couponCode.trim()) {
      setCouponMessage("Enter a coupon code");
      return;
    }

    try {
      const token = getValidLegacyToken();

      const response = await fetch(`${API}/api/v1/coupons/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ coupon_code: couponCode.trim(), purchase_amount: subtotal }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        const detail = await response.json().catch(() => null);
        setDiscountAmount(0);
        setCouponMessage(detail?.detail || "Invalid coupon");
        return;
      }

      const data = await response.json();
      setDiscountAmount(data.discount || 0);
      setCouponMessage("Coupon applied successfully");
    } catch {
      setCouponMessage("Unable to apply coupon");
    }
  };

  const placeOrder = async () => {
    if (!cart || cart.items.length === 0 || !userId) return;
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setPlacingOrder(true);
    setError(null);

    try {
      const token = getValidLegacyToken();

      const shippingAddress = [
        form.fullName.trim(),
        form.phone.trim(),
        form.addressLine.trim(),
        `${form.city.trim()}, ${form.state.trim()} ${form.postalCode.trim()}`,
        form.notes.trim() ? `Notes: ${form.notes.trim()}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const response = await fetch(`${API}/api/v1/orders/from-cart/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          shipping_address: shippingAddress,
          coupon_code: couponCode.trim() || undefined,
          payment_method: paymentMethod,
          delivery_charge: deliveryCharge,
          subtotal_amount: subtotal,
          use_coins: useCoins,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        const detail = await response.json().catch(() => null);
        setError(detail?.detail || "Order placement failed");
        return;
      }

      router.push("/my-orders?from=checkout");
    } catch {
      setError("Order placement failed. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="app-shell">
        <div className="app-container space-y-4">
          <div className="ds-card h-24 animate-pulse bg-slate-200" />
          <div className="ds-card h-32 animate-pulse bg-slate-200" />
          <div className="ds-card h-32 animate-pulse bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error && !cart) {
    return (
      <div className="app-shell">
        <div className="app-container">
          <section className="ds-card text-center">
            <h1 className="text-xl font-semibold text-slate-900">Unable to load checkout</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <button onClick={fetchCheckoutData} className="ds-btn-primary mt-5" type="button">
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
            <h1 className="text-2xl font-semibold text-slate-900">Checkout</h1>
            <p className="mt-2 text-sm text-slate-600">Your cart is empty. Add products to continue.</p>
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
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Checkout</h1>
          <p className="mt-2 text-sm text-slate-600">Complete your order safely and quickly.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">Checkout</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">Order Confirmed</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">My Orders</span>
          </div>
        </section>

        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr]">
          <div className="space-y-5">
            <section className="ds-card">
              <h2 className="text-lg font-semibold text-slate-900">Delivery Details</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  placeholder="Full Name"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                />
                <input
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="Phone Number"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                />
                <input
                  value={form.addressLine}
                  onChange={(event) => setForm((prev) => ({ ...prev, addressLine: event.target.value }))}
                  placeholder="Address"
                  className="sm:col-span-2 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                />
                <input
                  value={form.city}
                  onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                  placeholder="City"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                />
                <input
                  value={form.state}
                  onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))}
                  placeholder="State"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                />
                <input
                  value={form.postalCode}
                  onChange={(event) => setForm((prev) => ({ ...prev, postalCode: event.target.value }))}
                  placeholder="Postal Code"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                />
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={3}
                  placeholder="Optional notes"
                  className="sm:col-span-2 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                />
              </div>
            </section>

            <section className="ds-card">
              <h2 className="text-lg font-semibold text-slate-900">Payment</h2>
              <p className="mt-1 text-sm text-slate-600">
                Select a preferred method. Online payment can be confirmed after order placement.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    paymentMethod === "cod" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700"
                  }`}
                >
                  Cash on Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("upi")}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    paymentMethod === "upi" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700"
                  }`}
                >
                  UPI (MVP)
                </button>
              </div>
            </section>

            <section className="ds-card">
              <h2 className="text-lg font-semibold text-slate-900">Discounts & Rewards</h2>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                  placeholder="Enter coupon code"
                />
                <button onClick={handleCouponApply} className="ds-btn-secondary" type="button">
                  Apply Coupon
                </button>
              </div>
              {couponMessage && <p className="mt-2 text-sm text-slate-500">{couponMessage}</p>}

              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">Use Coins</p>
                  <p className="text-xs text-slate-500">Available: {coinBalance?.balance ?? 0}</p>
                </div>
                <button
                  onClick={() => setUseCoins((prev) => !prev)}
                  type="button"
                  className={`rounded-full border px-4 py-2 text-xs font-semibold ${
                    useCoins ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700"
                  }`}
                >
                  {useCoins ? "Coins Applied" : "Apply Coins"}
                </button>
              </div>
            </section>
          </div>

          <aside className="ds-card h-fit">
            <h2 className="text-lg font-semibold text-slate-900">Order Review</h2>
            <div className="mt-3 space-y-3">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <img
                    src={resolveProductImageSrc(item.product?.image_url, API)}
                    alt={item.product?.name || "Product"}
                    className="h-12 w-12 rounded-lg object-cover"
                    onError={(event) => {
                      event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium text-slate-900">{item.product?.name || "Product"}</p>
                    <p className="text-xs text-slate-500">Qty {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    ₹{((item.product?.price || 0) * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Items ({itemCount})</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Delivery ({deliveryOption})</span>
                <span>₹{deliveryCharge.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-600">
                <span>Discount</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-base font-semibold text-slate-900">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryOption("standard")}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                  deliveryOption === "standard"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-700"
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setDeliveryOption("priority")}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                  deliveryOption === "priority"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-700"
                }`}
              >
                Priority
              </button>
            </div>

            <button
              onClick={placeOrder}
              disabled={placingOrder}
              className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              type="button"
            >
              {placingOrder ? "Placing Order..." : "Place Order"}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}