"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Product {
  id: number;
  name: string;
  price: number;
  image_url?: string;
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
  streak_count: number;
  badge_label?: string | null;
}

const steps = ["Cart", "Address", "Delivery", "Payment", "Review"];

export default function CheckoutPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [address, setAddress] = useState("");
  const [deliveryOption, setDeliveryOption] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cod">("upi");
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [coinBalance, setCoinBalance] = useState<CoinBalance | null>(null);
  const [useCoins, setUseCoins] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const profileResponse = await fetch(`${API}/api/v1/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!profileResponse.ok) {
          router.push("/login");
          return;
        }

        const profile = await profileResponse.json();
        const cartResponse = await fetch(`${API}/api/v1/cart/${profile.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!cartResponse.ok) {
          throw new Error("Unable to fetch cart");
        }

        const cartData: Cart = await cartResponse.json();
        setCart(cartData);

        const coinsResponse = await fetch(`${API}/api/v1/coins/balance`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (coinsResponse.ok) {
          const coinsData = await coinsResponse.json();
          setCoinBalance({
            balance: coinsData.balance ?? 0,
            streak_count: coinsData.streak_count ?? 0,
            badge_label: coinsData.badge_label,
          });
        }
      } catch (err) {
        setError("Unable to load checkout");
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [API, router]);

  const subtotal = useMemo(() => {
    if (!cart) return 0;
    return cart.items.reduce((sum, item) => sum + (item.product?.price ?? 0) * item.quantity, 0);
  }, [cart]);

  const deliveryCharge = useMemo(() => {
    if (deliveryOption === "priority") return 75;
    return 40;
  }, [deliveryOption]);

  const total = useMemo(() => {
    return Math.max(subtotal + deliveryCharge - discountAmount, 0);
  }, [subtotal, deliveryCharge, discountAmount]);

  const handleCouponApply = async () => {
    setCouponMessage(null);
    setError(null);
    if (!couponCode) {
      setCouponMessage("Enter a coupon code");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API}/api/v1/coupons/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ coupon_code: couponCode, purchase_amount: subtotal }),
      });

      if (!response.ok) {
        const detail = await response.json();
        setCouponMessage(detail.detail || "Invalid coupon");
        setDiscountAmount(0);
        return;
      }

      const data = await response.json();
      setDiscountAmount(data.discount || 0);
      setCouponMessage("Coupon applied!");
    } catch (err) {
      setCouponMessage("Unable to apply coupon");
    }
  };

  const placeOrder = async () => {
    if (!cart || cart.items.length === 0) return;
    if (!address) {
      setError("Please enter a delivery address");
      return;
    }

    setPlacingOrder(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const profileResponse = await fetch(`${API}/api/v1/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!profileResponse.ok) {
        router.push("/login");
        return;
      }

      const profile = await profileResponse.json();
      const orderResponse = await fetch(`${API}/api/v1/orders/from-cart/${profile.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shipping_address: address,
          coupon_code: couponCode || undefined,
          payment_method: paymentMethod,
          delivery_charge: deliveryCharge,
          subtotal_amount: subtotal,
          use_coins: useCoins,
        }),
      });

      if (!orderResponse.ok) {
        const detail = await orderResponse.json();
        setError(detail.detail || "Order failed");
        return;
      }

      await fetch(`${API}/api/v1/carts/${profile.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      router.push("/my-orders");
    } catch (err) {
      setError("Order failed. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Checkout</h1>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600">Your cart is empty.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">Checkout</h1>
        <div className="flex flex-wrap gap-3 mb-8 text-sm text-gray-500">
          {steps.map((step, index) => (
            <span key={step} className={index <= stepIndex ? "text-purple-600" : ""}>
              {index + 1}. {step}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Cart Items</h2>
              <div className="space-y-4">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img
                        src={item.product?.image_url ? `${API}${item.product?.image_url}` : "/default-product.png"}
                        alt={item.product?.name || "Product"}
                        className="h-16 w-16 rounded object-cover"
                      />
                      <div>
                        <p className="font-semibold">{item.product?.name}</p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <div className="font-semibold">
                      ₹{((item.product?.price ?? 0) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Delivery Address</h2>
              <textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-4 py-3"
                placeholder="Enter full delivery address"
              />
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Delivery Option</h2>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeliveryOption("standard")}
                  className={`px-4 py-2 rounded-full border ${deliveryOption === "standard" ? "border-purple-500 text-purple-600" : "border-gray-200"}`}
                >
                  Standard (₹40)
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryOption("priority")}
                  className={`px-4 py-2 rounded-full border ${deliveryOption === "priority" ? "border-purple-500 text-purple-600" : "border-gray-200"}`}
                >
                  Priority (₹75)
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("upi")}
                  className={`px-4 py-2 rounded-full border ${paymentMethod === "upi" ? "border-purple-500 text-purple-600" : "border-gray-200"}`}
                >
                  UPI
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={`px-4 py-2 rounded-full border ${paymentMethod === "cod" ? "border-purple-500 text-purple-600" : "border-gray-200"}`}
                >
                  Cash on Delivery
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Coupon Code</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-3"
                  placeholder="Enter coupon code"
                />
                <button
                  type="button"
                  onClick={handleCouponApply}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg"
                >
                  Apply
                </button>
              </div>
              {couponMessage && <p className="mt-2 text-sm text-gray-500">{couponMessage}</p>}
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Use Coins</h2>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-600">Available Coins: {coinBalance?.balance ?? 0}</p>
                  {coinBalance?.badge_label && (
                    <p className="text-xs text-purple-500">Badge: {coinBalance.badge_label}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setUseCoins((prev) => !prev)}
                  className={`px-4 py-2 rounded-full border ${
                    useCoins ? "border-purple-500 text-purple-600" : "border-gray-200"
                  }`}
                >
                  {useCoins ? "Coins Applied" : "Apply Coins"}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Coins will reduce your payable total automatically at checkout.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-6 h-fit">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>₹{deliveryCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

            <button
              onClick={placeOrder}
              disabled={placingOrder}
              className="mt-6 w-full rounded-lg bg-green-600 py-3 text-white font-semibold disabled:opacity-50"
            >
              {placingOrder ? "Placing order..." : "Place Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}