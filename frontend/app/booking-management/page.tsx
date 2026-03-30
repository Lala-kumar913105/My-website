"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface BookingItem {
  id: number;
  service_id: number;
  booking_time: string;
  original_booking_time?: string | null;
  status: string;
  notes?: string | null;
  buyer_notes?: string | null;
  seller_notes?: string | null;
  reschedule_requested?: number | null;
  total_amount: number;
  user_id: number;
}

const STATUS_OPTIONS = ["pending", "confirmed", "rescheduled", "completed", "cancelled"];

export default function BookingManagementPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [noteDraft, setNoteDraft] = useState<Record<number, string>>({});
  const [rescheduleDraft, setRescheduleDraft] = useState<Record<number, string>>({});
  const [notification, setNotification] = useState<string | null>(null);

  const fetchBookings = async (status?: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const query = status ? `?status=${status}` : "";
      const response = await fetch(`${API}/api/v1/bookings/seller/me${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
        }
        return;
      }

      const data: BookingItem[] = await response.json();
      setBookings(data);
    } catch (error) {
      console.error("Failed to load bookings", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleStatusUpdate = async (bookingId: number, status: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const response = await fetch(`${API}/api/v1/bookings/${bookingId}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (response.ok) {
      const updated = await response.json();
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
      setNotification(`Booking #${bookingId} marked as ${status}`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleReschedule = async (bookingId: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const booking_time = rescheduleDraft[bookingId];
    if (!booking_time) return;

    const response = await fetch(`${API}/api/v1/bookings/${bookingId}/reschedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ booking_time: new Date(booking_time).toISOString() }),
    });

    if (response.ok) {
      const updated = await response.json();
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
      setNotification(`Booking #${bookingId} rescheduled`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleNoteSave = async (bookingId: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const response = await fetch(`${API}/api/v1/bookings/${bookingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ seller_notes: noteDraft[bookingId] }),
    });

    if (response.ok) {
      const updated = await response.json();
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
    }
  };

  const grouped = useMemo(() => {
    const upcoming = bookings.filter((b) => new Date(b.booking_time) > new Date());
    const past = bookings.filter((b) => new Date(b.booking_time) <= new Date());
    return { upcoming, past };
  }, [bookings]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold">Booking Management</h1>
          <select
            value={statusFilter}
            onChange={(event) => {
              const value = event.target.value;
              setStatusFilter(value);
              fetchBookings(value);
            }}
            className="rounded-lg border border-gray-200 px-4 py-2"
          >
            <option value="">All Status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {notification && (
          <div className="mb-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            {notification}
          </div>
        )}

        {["upcoming", "past"].map((section) => (
          <div key={section} className="mb-8">
            <h2 className="text-xl font-semibold mb-4 capitalize">{section} bookings</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {(grouped as any)[section].map((booking: BookingItem) => (
                <div key={booking.id} className="bg-white rounded-xl shadow p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Booking #{booking.id}</p>
                      <p className="text-sm text-gray-500">Service #{booking.service_id}</p>
                      <p className="text-sm text-gray-500">{new Date(booking.booking_time).toLocaleString()}</p>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-purple-50 text-purple-700">
                      {booking.status}
                    </span>
                  </div>
                  {booking.original_booking_time && (
                    <p className="mt-2 text-xs text-gray-400">Original: {new Date(booking.original_booking_time).toLocaleString()}</p>
                  )}
                  <div className="mt-4 space-y-2 text-sm">
                    <p>Total: ₹{booking.total_amount}</p>
                    {booking.buyer_notes && <p>Buyer notes: {booking.buyer_notes}</p>}
                  </div>
                  <div className="mt-4">
                    <label className="text-xs text-gray-500">Seller notes</label>
                    <textarea
                      value={noteDraft[booking.id] ?? booking.seller_notes ?? ""}
                      onChange={(event) =>
                        setNoteDraft((prev) => ({ ...prev, [booking.id]: event.target.value }))
                      }
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => handleNoteSave(booking.id)}
                      className="mt-2 text-xs text-purple-600"
                    >
                      Save notes
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleStatusUpdate(booking.id, "confirmed")}
                      className="px-3 py-1 rounded bg-indigo-50 text-indigo-700 text-xs"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(booking.id, "completed")}
                      className="px-3 py-1 rounded bg-green-50 text-green-700 text-xs"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(booking.id, "cancelled")}
                      className="px-3 py-1 rounded bg-red-50 text-red-700 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="mt-4">
                    <label className="text-xs text-gray-500">Reschedule</label>
                    <input
                      type="datetime-local"
                      value={rescheduleDraft[booking.id] ?? ""}
                      onChange={(event) =>
                        setRescheduleDraft((prev) => ({ ...prev, [booking.id]: event.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => handleReschedule(booking.id)}
                      className="mt-2 text-xs text-purple-600"
                    >
                      Reschedule booking
                    </button>
                  </div>
                </div>
              ))}
              {(grouped as any)[section].length === 0 && (
                <div className="text-sm text-gray-500">No bookings found.</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
