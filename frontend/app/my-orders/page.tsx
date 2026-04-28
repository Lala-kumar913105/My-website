"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE_URL } from "../../lib/auth";
import { FALLBACK_PRODUCT_IMAGE, resolveProductImageSrc } from "../../lib/image";

type OrderStatus = "pending" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";

interface OrderProduct {
  id: number;
  name: string;
  image_url?: string | null;
  price: number;
}

interface OrderSeller {
  id: number;
  business_name: string;
}

interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price_at_purchase: number;
  product?: OrderProduct;
  seller?: OrderSeller | null;
}

interface Order {
  id: number;
  total_amount: number;
  final_amount: number;
  status: OrderStatus;
  created_at: string;
  shipping_address?: string | null;
  order_items: OrderItem[];
}

const STATUS_STEPS: OrderStatus[] = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered"];

const badgeStyle: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  preparing: "bg-indigo-50 text-indigo-700 border-indigo-200",
  out_for_delivery: "bg-violet-50 text-violet-700 border-violet-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

const statusLabel: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const humanize = (value: string) => value.replace(/_/g, " ");

function MyOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const API = API_BASE_URL;

  const [orders, setOrders] = useState<Order[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [reorderBusyId, setReorderBusyId] = useState<number | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login?next=%2Fmy-orders");
          return;
        }

        const meResponse = await fetch(`${API}/api/v1/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!meResponse.ok) {
          localStorage.removeItem("token");
          router.push("/login?next=%2Fmy-orders");
          return;
        }

        const me = await meResponse.json();
        setUserId(me.id);

        const ordersResponse = await fetch(`${API}/api/v1/orders/user/${me.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!ordersResponse.ok) {
          if (ordersResponse.status === 401) {
            localStorage.removeItem("token");
            router.push("/login?next=%2Fmy-orders");
            return;
          }
          throw new Error("Unable to load your orders");
        }

        const data: Order[] = await ordersResponse.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load your orders");
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [API, router]);

  const reorder = async (order: Order) => {
    if (!userId) return;
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login?next=%2Fmy-orders");
      return;
    }

    setReorderBusyId(order.id);
    try {
      for (const item of order.order_items) {
        await fetch(`${API}/api/v1/carts/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: userId,
            product_id: item.product_id,
            quantity: item.quantity,
          }),
        });
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cart:changed"));
      }
      router.push("/cart");
    } finally {
      setReorderBusyId(null);
    }
  };

  const orderCount = useMemo(() => orders.length, [orders]);

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

  if (error) {
    return (
      <div className="app-shell">
        <div className="app-container">
          <section className="ds-card text-center">
            <h1 className="text-xl font-semibold text-slate-900">Unable to load orders</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <button onClick={() => window.location.reload()} className="ds-btn-primary mt-5" type="button">
              Retry
            </button>
          </section>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="app-shell">
        <div className="app-container">
          <section className="ds-card text-center">
            <h1 className="text-2xl font-semibold text-slate-900">My Orders</h1>
            <p className="mt-2 text-sm text-slate-600">Track your purchases and order status in one place.</p>
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
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">My Orders</h1>
          <p className="mt-2 text-sm text-slate-600">Track your purchases and order status in one place.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">Checkout</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">Order Confirmed</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">My Orders</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">{orderCount} order{orderCount > 1 ? "s" : ""} in your history</p>
        </section>

        {searchParams.get("from") === "checkout" && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Order placed successfully. You can track all updates here.
          </p>
        )}

        <section className="space-y-3">
          {orders.map((order) => {
            const firstItem = order.order_items[0];
            const firstProduct = firstItem?.product;
            const seller = firstItem?.seller;
            const statusIndex = Math.max(STATUS_STEPS.indexOf(order.status), 0);
            const progress = ((statusIndex + 1) / STATUS_STEPS.length) * 100;
            const expanded = expandedOrderId === order.id;

            return (
              <article key={order.id} className="ds-card space-y-3">
                <div className="flex items-start gap-3">
                  <img
                    src={resolveProductImageSrc(firstProduct?.image_url, API)}
                    alt={firstProduct?.name || "Order item"}
                    className="h-16 w-16 rounded-xl object-cover"
                    onError={(event) => {
                      event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="line-clamp-1 text-base font-semibold text-slate-900">
                        {firstProduct?.name || `Order #${order.id}`}
                      </h2>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeStyle[order.status] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                        {statusLabel[order.status] || humanize(order.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Order #{order.id} • {new Date(order.created_at).toLocaleString()}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {order.order_items.length} item{order.order_items.length > 1 ? "s" : ""} • ₹{(order.final_amount ?? order.total_amount).toFixed(2)}
                    </p>
                    {seller?.business_name && <p className="text-xs text-slate-500">Seller: {seller.business_name}</p>}
                  </div>
                </div>

                <div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-slate-900" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    {STATUS_STEPS.map((step, index) => (
                      <span key={`${order.id}-${step}`} className={index <= statusIndex ? "text-slate-900" : ""}>
                        {humanize(step)}
                      </span>
                    ))}
                  </div>
                </div>

                {expanded && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    <div className="space-y-1">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between">
                          <span>{item.product?.name || `Product #${item.product_id}`} × {item.quantity}</span>
                          <span>₹{(item.price_at_purchase * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    {order.shipping_address && <p className="mt-2 text-xs text-slate-500">Shipping: {order.shipping_address}</p>}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedOrderId(expanded ? null : order.id)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {expanded ? "Hide Details" : "View Details"}
                  </button>
                  {seller?.id ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/store/${seller.id}`)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Contact Seller
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => reorder(order)}
                    disabled={reorderBusyId === order.id}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {reorderBusyId === order.id ? "Reordering..." : "Reorder"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}

export default function MyOrdersPage() {
  return (
    <Suspense fallback={<div>Loading orders...</div>}>
      <MyOrdersContent />
    </Suspense>
  );
}