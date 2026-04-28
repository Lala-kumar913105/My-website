"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "../../lib/auth";
import { FALLBACK_PRODUCT_IMAGE, resolveProductImageSrc } from "../../lib/image";

type SellerProfile = {
  id: number;
  business_name?: string | null;
  business_address?: string | null;
  approved?: boolean;
  rating?: number | null;
};

type ListingItem = {
  id: number;
  title: string;
  description?: string | null;
  price: number;
  type: "product" | "service" | string;
  stock?: number | null;
  duration_minutes?: number | null;
  image_url?: string | null;
  source_type?: "product" | "service" | string | null;
};

type SellerOrder = {
  order_id: number;
  total_amount: number;
  final_amount?: number | null;
  status: string;
  payment_status?: string;
  created_at?: string;
  buyer?: {
    id?: number | null;
    name?: string | null;
    phone_number?: string | null;
  };
  items?: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
  }>;
};

type SellerBooking = {
  id: number;
  service_id: number;
  listing_id?: number | null;
  booking_time: string;
  status: string;
  total_amount: number;
  buyer_notes?: string | null;
};

type SellerAnalytics = {
  total_orders?: number;
  total_bookings?: number;
  total_sales?: number;
  total_revenue?: number;
};

const formatCurrency = (value: number | undefined | null) => `₹${Number(value || 0).toFixed(2)}`;
const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString() : "-");

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  confirmed: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  preparing: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  out_for_delivery: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  delivered: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  completed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  rescheduled: "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200",
};

const STATUS_LABEL: Record<string, string> = {
  out_for_delivery: "Out for delivery",
};

function statusClass(status?: string) {
  return STATUS_BADGE[status || ""] || "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

function statusLabel(status?: string) {
  if (!status) return "Unknown";
  return STATUS_LABEL[status] || status.replace(/_/g, " ");
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [token, setToken] = useState<string>("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [sellerMissing, setSellerMissing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [bookings, setBookings] = useState<SellerBooking[]>([]);
  const [analytics, setAnalytics] = useState<SellerAnalytics | null>(null);

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyDeleteId, setBusyDeleteId] = useState<number | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [busyBookingId, setBusyBookingId] = useState<number | null>(null);

  const authHeaders = useCallback(
    (json = false): HeadersInit => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(json ? { "Content-Type": "application/json" } : {}),
    }),
    [token],
  );

  const loadDashboardData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setGlobalError(null);

    const [listingsRes, ordersRes, bookingsRes, analyticsRes] = await Promise.allSettled([
      fetch(`${API_BASE_URL}/api/v1/listings/seller?limit=200`, { headers: authHeaders(), credentials: "include" }),
      fetch(`${API_BASE_URL}/api/v1/seller/orders?page=1&page_size=6`, { headers: authHeaders(), credentials: "include" }),
      fetch(`${API_BASE_URL}/api/v1/bookings/seller/me?limit=6`, { headers: authHeaders(), credentials: "include" }),
      fetch(`${API_BASE_URL}/api/v1/seller/analytics`, { headers: authHeaders(), credentials: "include" }),
    ]);

    let hasAnySuccess = false;

    if (listingsRes.status === "fulfilled" && listingsRes.value.ok) {
      hasAnySuccess = true;
      const data = (await listingsRes.value.json()) as ListingItem[];
      setListings(Array.isArray(data) ? data : []);
    }

    if (ordersRes.status === "fulfilled" && ordersRes.value.ok) {
      hasAnySuccess = true;
      const data = await ordersRes.value.json();
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    }

    if (bookingsRes.status === "fulfilled" && bookingsRes.value.ok) {
      hasAnySuccess = true;
      const data = (await bookingsRes.value.json()) as SellerBooking[];
      setBookings(Array.isArray(data) ? data : []);
    }

    if (analyticsRes.status === "fulfilled" && analyticsRes.value.ok) {
      hasAnySuccess = true;
      const data = (await analyticsRes.value.json()) as SellerAnalytics;
      setAnalytics(data);
    }

    if (!hasAnySuccess) {
      setGlobalError("We couldn't load seller dashboard data right now. Please retry.");
    }

    setLoading(false);
  }, [authHeaders, token]);

  useEffect(() => {
    const init = async () => {
      const storedToken = localStorage.getItem("token") || "";
      setToken(storedToken);

      try {
        const profileRes = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
          headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : undefined,
          credentials: "include",
        });

        if (profileRes.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login");
          return;
        }

        if (profileRes.ok) {
          const profile = await profileRes.json();
          setUserRole(profile?.role || null);
        }

        const sellerRes = await fetch(`${API_BASE_URL}/api/v1/sellers/me`, {
          headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : undefined,
          credentials: "include",
        });

        if (sellerRes.ok) {
          const sellerData = (await sellerRes.json()) as SellerProfile;
          setSeller(sellerData);
          setSellerMissing(false);
        } else if (sellerRes.status === 404) {
          setSeller(null);
          setSellerMissing(true);
          setLoading(false);
        } else if (sellerRes.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login");
          return;
        } else {
          setGlobalError("Unable to verify seller profile right now.");
          setLoading(false);
        }
      } catch {
        setGlobalError("Unable to load seller dashboard right now.");
        setLoading(false);
      } finally {
        setAuthChecking(false);
      }
    };

    init();
  }, [router]);

  useEffect(() => {
    if (!token || sellerMissing || !seller) return;
    loadDashboardData();
  }, [token, sellerMissing, seller, loadDashboardData]);

  const statItems = useMemo(() => {
    const totalListings = listings.length;
    const activeProducts = listings.filter((item) => item.type === "product").length;
    const activeServices = listings.filter((item) => item.type === "service").length;
    return [
      { label: "Total Listings", value: totalListings },
      { label: "Active Products", value: activeProducts },
      { label: "Active Services", value: activeServices },
      { label: "Orders", value: analytics?.total_orders ?? orders.length },
      { label: "Bookings", value: analytics?.total_bookings ?? bookings.length },
      { label: "Revenue", value: formatCurrency(analytics?.total_revenue ?? analytics?.total_sales) },
    ];
  }, [analytics, bookings.length, listings, orders.length]);

  const handleListingDelete = async (listingId: number) => {
    if (!confirm("Delete this listing? This action cannot be undone.")) return;
    setBusyDeleteId(listingId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/listings/${listingId}`, {
        method: "DELETE",
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      setListings((prev) => prev.filter((item) => item.id !== listingId));
      setNotice("Listing deleted successfully.");
    } catch {
      setNotice("Unable to delete listing right now.");
    } finally {
      setBusyDeleteId(null);
    }
  };

  const handleOrderAction = async (orderId: number, action: string) => {
    setBusyOrderId(orderId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/seller/order-action`, {
        method: "POST",
        headers: authHeaders(true),
        credentials: "include",
        body: JSON.stringify({ order_id: orderId, action }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrders((prev) => prev.map((order) => (order.order_id === orderId ? { ...order, status: data.status } : order)));
      setNotice(`Order #${orderId} updated to ${statusLabel(data.status)}.`);
    } catch {
      setNotice("Unable to update order status.");
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleBookingStatus = async (bookingId: number, status: string) => {
    setBusyBookingId(bookingId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/bookings/${bookingId}/status`, {
        method: "POST",
        headers: authHeaders(true),
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setBookings((prev) => prev.map((item) => (item.id === bookingId ? updated : item)));
      setNotice(`Booking #${bookingId} marked as ${statusLabel(status)}.`);
    } catch {
      setNotice("Unable to update booking.");
    } finally {
      setBusyBookingId(null);
    }
  };

  if (authChecking) {
    return (
      <div className="app-shell">
        <div className="app-container">
          <div className="ds-card text-center text-sm text-slate-600">Checking seller access...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-container space-y-4">
        <section className="ds-hero-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Seller Dashboard</h1>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Manage your products, services, orders, and bookings in one place.
              </p>
            </div>
            {seller && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${seller.approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {seller.approved ? "Approved Seller" : "Approval Pending"}
              </span>
            )}
          </div>
          {seller?.business_name && (
            <p className="mt-3 text-sm text-slate-700">
              {seller.business_name}
              {seller.rating ? ` • ⭐ ${Number(seller.rating).toFixed(1)}` : ""}
            </p>
          )}
        </section>

        {notice && <section className="ds-card text-sm text-emerald-700">{notice}</section>}
        {globalError && <section className="ds-card text-sm text-rose-700">{globalError}</section>}

        {sellerMissing ? (
          <section className="ds-card">
            <h2 className="ds-title">Complete your seller setup</h2>
            <p className="ds-subtitle">
              We couldn't find your seller profile yet. Become a seller from profile, then return here.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="ds-btn-primary" onClick={() => router.push("/profile")}>Go to Profile</button>
              <button className="ds-btn-secondary" onClick={() => router.push("/")}>Back to Home</button>
            </div>
          </section>
        ) : (
          <>
            <section className="ds-card">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="ds-title">Quick Stats</h2>
                <button className="ds-btn-secondary !px-4" onClick={loadDashboardData}>Refresh</button>
              </div>
              {loading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {statItems.map((item) => (
                    <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="ds-card">
              <h2 className="ds-title">Quick Actions</h2>
              <p className="ds-subtitle">Start common seller tasks with one tap.</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {[
                  { label: "Add Product", href: "/add-product" },
                  { label: "Add Service", href: "/add-product" },
                  { label: "Manage Products", href: "/my-products" },
                  { label: "Manage Orders", href: "/seller-dashboard#orders" },
                  { label: "Manage Bookings", href: "/booking-management" },
                  { label: "Manage Slots", href: listings.find((l) => l.type === "service") ? `/seller/slots/${listings.find((l) => l.type === "service")?.id}` : "/my-products" },
                  { label: "View Store", href: seller ? `/store/${seller.id}` : "/search" },
                  { label: userRole === "seller" ? "Edit Profile" : "Become Seller", href: "/profile" },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => router.push(action.href)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="ds-card">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="ds-title">Listing Management</h2>
                <button className="ds-btn-secondary !px-4" onClick={() => router.push("/my-products")}>View All</button>
              </div>

              {!loading && listings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="text-base font-semibold text-slate-800">You have not added any listings yet</p>
                  <p className="mt-1 text-sm text-slate-600">Create your first product or service to start selling.</p>
                  <button className="ds-btn-primary mt-4" onClick={() => router.push("/add-product")}>Add Your First Listing</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {listings.slice(0, 6).map((listing) => (
                    <article key={listing.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex gap-3">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          <Image
                            src={resolveProductImageSrc(listing.image_url, API_BASE_URL) || FALLBACK_PRODUCT_IMAGE}
                            alt={listing.title}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="line-clamp-1 text-sm font-semibold text-slate-900">{listing.title}</p>
                            <span className="text-sm font-semibold text-slate-900">{formatCurrency(listing.price)}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs">
                            <span className={`rounded-full px-2 py-1 font-medium ${listing.type === "service" ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"}`}>
                              {listing.type === "service" ? "Service" : "Product"}
                            </span>
                            {listing.type === "product" && <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Stock {listing.stock ?? 0}</span>}
                            {listing.type === "service" && <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{listing.duration_minutes ?? 0} min</span>}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button className="ds-chip !py-1.5 !text-xs" onClick={() => router.push(`/add-product?edit=${listing.id}`)}>Edit</button>
                        <button className="ds-chip !py-1.5 !text-xs" onClick={() => router.push(`/search?q=${encodeURIComponent(listing.title)}`)}>View</button>
                        {listing.type === "service" && (
                          <button className="ds-chip !py-1.5 !text-xs" onClick={() => router.push(`/seller/slots/${listing.id}`)}>Manage Slots</button>
                        )}
                        <button
                          className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700"
                          disabled={busyDeleteId === listing.id}
                          onClick={() => handleListingDelete(listing.id)}
                        >
                          {busyDeleteId === listing.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section id="orders" className="ds-card">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="ds-title">Order Management</h2>
                <button className="ds-btn-secondary !px-4" onClick={() => router.push("/my-orders")}>Open Full Orders</button>
              </div>

              {!loading && orders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
                  No orders yet. Once buyers place orders, they will appear here.
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <article key={order.order_id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Order #{order.order_id}</p>
                          <p className="text-xs text-slate-500">{formatDateTime(order.created_at)}</p>
                          <p className="mt-1 text-xs text-slate-600">Buyer: {order.buyer?.name || "N/A"}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(order.status)}`}>
                            {statusLabel(order.status)}
                          </span>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(order.final_amount ?? order.total_amount)}</p>
                        </div>
                      </div>
                      {!!order.items?.length && (
                        <p className="mt-2 text-xs text-slate-600 line-clamp-1">
                          {(order.items || []).slice(0, 2).map((item) => `${item.name} × ${item.quantity}`).join(" • ")}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {order.status === "pending" && (
                          <button className="ds-chip !py-1.5 !text-xs" disabled={busyOrderId === order.order_id} onClick={() => handleOrderAction(order.order_id, "confirm")}>Confirm</button>
                        )}
                        {order.status === "confirmed" && (
                          <button className="ds-chip !py-1.5 !text-xs" disabled={busyOrderId === order.order_id} onClick={() => handleOrderAction(order.order_id, "prepare")}>Preparing</button>
                        )}
                        {order.status === "preparing" && (
                          <button className="ds-chip !py-1.5 !text-xs" disabled={busyOrderId === order.order_id} onClick={() => handleOrderAction(order.order_id, "out_for_delivery")}>Out for delivery</button>
                        )}
                        {order.status === "out_for_delivery" && (
                          <button className="ds-chip !py-1.5 !text-xs" disabled={busyOrderId === order.order_id} onClick={() => handleOrderAction(order.order_id, "deliver")}>Delivered</button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="ds-card">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="ds-title">Booking Management</h2>
                <button className="ds-btn-secondary !px-4" onClick={() => router.push("/booking-management")}>Open Full Bookings</button>
              </div>

              {!loading && bookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
                  No bookings yet. Service bookings will appear here.
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <article key={booking.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Booking #{booking.id}</p>
                          <p className="text-xs text-slate-500">{formatDateTime(booking.booking_time)}</p>
                          <p className="mt-1 text-xs text-slate-600">Service #{booking.listing_id ?? booking.service_id}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(booking.status)}`}>
                            {statusLabel(booking.status)}
                          </span>
                          <p className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(booking.total_amount)}</p>
                        </div>
                      </div>
                      {booking.buyer_notes && <p className="mt-2 text-xs text-slate-600">Buyer note: {booking.buyer_notes}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button className="ds-chip !py-1.5 !text-xs" onClick={() => router.push(`/seller/slots/${booking.listing_id ?? booking.service_id}`)}>
                          Manage Slot
                        </button>
                        {booking.status === "pending" && (
                          <button className="ds-chip !py-1.5 !text-xs" disabled={busyBookingId === booking.id} onClick={() => handleBookingStatus(booking.id, "confirmed")}>Confirm</button>
                        )}
                        {booking.status !== "completed" && booking.status !== "cancelled" && (
                          <button className="ds-chip !py-1.5 !text-xs" disabled={busyBookingId === booking.id} onClick={() => handleBookingStatus(booking.id, "completed")}>Complete</button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
