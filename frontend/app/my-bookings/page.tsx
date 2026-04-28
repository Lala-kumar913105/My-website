"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE_URL } from "../../lib/auth";
import { FALLBACK_PRODUCT_IMAGE, resolveProductImageSrc } from "../../lib/image";

type BookingStatus = "pending" | "confirmed" | "rescheduled" | "completed" | "cancelled";

interface BookingItem {
  id: number;
  service_id: number;
  booking_time: string;
  original_booking_time?: string | null;
  status: BookingStatus;
  notes?: string | null;
  buyer_notes?: string | null;
  seller_notes?: string | null;
  total_amount: number;
}

interface ServiceListing {
  id: number;
  source_id?: number | null;
  title: string;
  description?: string | null;
  image_url?: string | null;
  seller_id: number;
  seller_business_name?: string | null;
}

const statusLabel: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  rescheduled: "Rescheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

const badgeStyle: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  rescheduled: "bg-indigo-50 text-indigo-700 border-indigo-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

const canManage = (status: BookingStatus) => ["pending", "confirmed", "rescheduled"].includes(status);

function MyBookingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const API = API_BASE_URL;

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [serviceListings, setServiceListings] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [busyBookingId, setBusyBookingId] = useState<number | null>(null);
  const [expandedBookingId, setExpandedBookingId] = useState<number | null>(null);
  const [rescheduleDraft, setRescheduleDraft] = useState<Record<number, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login?next=%2Fmy-bookings");
          return;
        }

        const meResponse = await fetch(`${API}/api/v1/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!meResponse.ok) {
          localStorage.removeItem("token");
          router.push("/login?next=%2Fmy-bookings");
          return;
        }

        const me = await meResponse.json();

        const [bookingsResponse, listingsResponse] = await Promise.all([
          fetch(`${API}/api/v1/bookings/user/${me.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/api/v1/listings?listing_type=service&limit=200`),
        ]);

        if (!bookingsResponse.ok) {
          if (bookingsResponse.status === 401) {
            localStorage.removeItem("token");
            router.push("/login?next=%2Fmy-bookings");
            return;
          }
          throw new Error("Unable to load bookings");
        }

        const bookingsData: BookingItem[] = await bookingsResponse.json();
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);

        if (listingsResponse.ok) {
          const listingsData: ServiceListing[] = await listingsResponse.json();
          setServiceListings(Array.isArray(listingsData) ? listingsData : []);
        } else {
          setServiceListings([]);
        }
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load bookings");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [API, router]);

  const getListing = (serviceId: number) =>
    serviceListings.find((listing) => listing.source_id === serviceId || listing.id === serviceId) || null;

  const updateStatus = async (bookingId: number, status: BookingStatus) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login?next=%2Fmy-bookings");
      return;
    }

    setBusyBookingId(bookingId);
    try {
      const response = await fetch(`${API}/api/v1/bookings/${bookingId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.detail || "Unable to update booking");
      }

      const updated = await response.json();
      setBookings((prev) => prev.map((booking) => (booking.id === bookingId ? updated : booking)));
      setNotification(`Booking #${bookingId} updated to ${statusLabel[status]}`);
      setTimeout(() => setNotification(null), 2500);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Unable to update booking");
    } finally {
      setBusyBookingId(null);
    }
  };

  const requestReschedule = async (bookingId: number) => {
    const value = rescheduleDraft[bookingId];
    if (!value) {
      setError("Please pick a new date and time first.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login?next=%2Fmy-bookings");
      return;
    }

    setBusyBookingId(bookingId);
    setError(null);
    try {
      const response = await fetch(`${API}/api/v1/bookings/${bookingId}/reschedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ booking_time: new Date(value).toISOString() }),
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.detail || "Unable to request reschedule");
      }

      const updated = await response.json();
      setBookings((prev) => prev.map((booking) => (booking.id === bookingId ? updated : booking)));
      setRescheduleDraft((prev) => ({ ...prev, [bookingId]: "" }));
      setNotification(`Reschedule requested for booking #${bookingId}`);
      setTimeout(() => setNotification(null), 2500);
    } catch (rescheduleError) {
      setError(rescheduleError instanceof Error ? rescheduleError.message : "Unable to request reschedule");
    } finally {
      setBusyBookingId(null);
    }
  };

  const sortedBookings = useMemo(
    () => [...bookings].sort((a, b) => new Date(b.booking_time).getTime() - new Date(a.booking_time).getTime()),
    [bookings],
  );

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

  if (error && bookings.length === 0) {
    return (
      <div className="app-shell">
        <div className="app-container">
          <section className="ds-card text-center">
            <h1 className="text-xl font-semibold text-slate-900">Unable to load bookings</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <button onClick={() => window.location.reload()} className="ds-btn-primary mt-5" type="button">
              Retry
            </button>
          </section>
        </div>
      </div>
    );
  }

  if (sortedBookings.length === 0) {
    return (
      <div className="app-shell">
        <div className="app-container">
          <section className="ds-card text-center">
            <h1 className="text-2xl font-semibold text-slate-900">My Bookings</h1>
            <p className="mt-2 text-sm text-slate-600">View your scheduled services and booking updates.</p>
            <button onClick={() => router.push("/search?type=service")} className="ds-btn-primary mt-5" type="button">
              Explore Services
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
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">My Bookings</h1>
          <p className="mt-2 text-sm text-slate-600">View your scheduled services and booking updates.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">Book Service</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">Booking Confirmed</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">My Bookings</span>
          </div>
        </section>

        {searchParams.get("from") === "booking" && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Booking confirmed successfully. You can track updates here.
          </p>
        )}

        {notification && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notification}</p>}
        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <section className="space-y-3">
          {sortedBookings.map((booking) => {
            const listing = getListing(booking.service_id);
            const expanded = expandedBookingId === booking.id;
            const busy = busyBookingId === booking.id;
            const canEdit = canManage(booking.status);

            return (
              <article key={booking.id} className="ds-card space-y-3">
                <div className="flex items-start gap-3">
                  <img
                    src={resolveProductImageSrc(listing?.image_url, API)}
                    alt={listing?.title || "Service"}
                    className="h-16 w-16 rounded-xl object-cover"
                    onError={(event) => {
                      event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="line-clamp-1 text-base font-semibold text-slate-900">
                        {listing?.title || `Service #${booking.service_id}`}
                      </h2>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeStyle[booking.status] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                        {statusLabel[booking.status] || booking.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Booking #{booking.id} • {new Date(booking.booking_time).toLocaleString()}</p>
                    <p className="mt-1 text-sm text-slate-600">Amount: ₹{booking.total_amount.toFixed(2)}</p>
                    {listing?.seller_business_name && <p className="text-xs text-slate-500">Provider: {listing.seller_business_name}</p>}
                  </div>
                </div>

                {expanded && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    <p>{listing?.description?.trim() || "Service details are available on the listing page."}</p>
                    {booking.original_booking_time && (
                      <p className="mt-2 text-xs text-slate-500">
                        Original time: {new Date(booking.original_booking_time).toLocaleString()}
                      </p>
                    )}
                    {(booking.buyer_notes || booking.notes) && (
                      <p className="mt-2 text-xs text-slate-500">Your notes: {booking.buyer_notes || booking.notes}</p>
                    )}
                    {booking.seller_notes && <p className="mt-1 text-xs text-slate-500">Provider notes: {booking.seller_notes}</p>}

                    {canEdit && (
                      <div className="mt-3 space-y-2">
                        <label className="text-xs font-medium text-slate-600">Request reschedule</label>
                        <input
                          type="datetime-local"
                          value={rescheduleDraft[booking.id] || ""}
                          onChange={(event) =>
                            setRescheduleDraft((prev) => ({
                              ...prev,
                              [booking.id]: event.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => requestReschedule(booking.id)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          Send Reschedule Request
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedBookingId(expanded ? null : booking.id)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {expanded ? "Hide Details" : "View Details"}
                  </button>
                  {listing?.seller_id ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/store/${listing.seller_id}`)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Contact Provider
                    </button>
                  ) : null}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => updateStatus(booking.id, "cancelled")}
                      disabled={busy}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}

export default function MyBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell">
          <div className="app-container space-y-4">
            <div className="ds-card h-24 animate-pulse bg-slate-200" />
            <div className="ds-card h-28 animate-pulse bg-slate-200" />
            <div className="ds-card h-28 animate-pulse bg-slate-200" />
          </div>
        </div>
      }
    >
      <MyBookingsContent />
    </Suspense>
  );
}