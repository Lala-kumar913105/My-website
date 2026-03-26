"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface BookingItem {
  id: number;
  service_id: number;
  listing_id?: number;
  booking_time: string;
  original_booking_time?: string | null;
  status: string;
  notes?: string | null;
  buyer_notes?: string | null;
  seller_notes?: string | null;
  total_amount: number;
}

const STATUS_STEPS = ["pending", "confirmed", "rescheduled", "completed", "cancelled"];

export default function MyBookingsPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const profileResponse = await fetch(`${API}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!profileResponse.ok) {
        router.push("/login");
        return;
      }

      const profile = await profileResponse.json();
      const response = await fetch(`${API}/api/v1/bookings/user/${profile.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        return;
      }

      const data: BookingItem[] = await response.json();
      setBookings(data);
    } catch (error) {
      console.error("Failed to fetch bookings", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const grouped = useMemo(() => {
    const upcoming = bookings.filter((b) => new Date(b.booking_time) > new Date());
    const past = bookings.filter((b) => new Date(b.booking_time) <= new Date());
    return { upcoming, past };
  }, [bookings]);

  const handleCancel = async (bookingId: number) => {
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
      body: JSON.stringify({ status: "cancelled" }),
    });

    if (response.ok) {
      const updated = await response.json();
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
      setNotification(`Booking #${bookingId} cancelled`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleRescheduleRequest = async (bookingId: number, newTime: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const response = await fetch(`${API}/api/v1/bookings/${bookingId}/reschedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ booking_time: new Date(newTime).toISOString() }),
    });

    if (response.ok) {
      const updated = await response.json();
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
      setNotification(`Reschedule requested for booking #${bookingId}`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <button
            onClick={fetchBookings}
            className="text-sm text-purple-600 hover:underline"
          >
            Refresh
          </button>
        </div>

        {notification && (
          <div className="mb-6 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {notification}
          </div>
        )}

        {["upcoming", "past"].map((section) => (
          <div key={section} className="mb-8">
            <h2 className="text-xl font-semibold mb-4 capitalize">{section} bookings</h2>
            <div className="space-y-4">
              {(grouped as any)[section].map((booking: BookingItem) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onCancel={handleCancel}
                  onReschedule={handleRescheduleRequest}
                />
              ))}
              {(grouped as any)[section].length === 0 && (
                <p className="text-sm text-gray-500">No bookings found.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  onCancel,
  onReschedule,
}: {
  booking: BookingItem;
  onCancel: (id: number) => void;
  onReschedule: (id: number, time: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const statusIndex = STATUS_STEPS.indexOf(booking.status);

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-semibold">Booking #{booking.id}</p>
          <p className="text-sm text-gray-500">Service Listing #{booking.listing_id ?? booking.service_id}</p>
          <p className="text-sm text-gray-500">{new Date(booking.booking_time).toLocaleString()}</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-purple-50 text-purple-700">
          {booking.status}
        </span>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>Total: ₹{booking.total_amount}</p>
        {booking.buyer_notes && <p>Notes: {booking.buyer_notes}</p>}
        {booking.seller_notes && <p>Seller notes: {booking.seller_notes}</p>}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-gray-500">
          {STATUS_STEPS.map((step, index) => (
            <span key={step} className={index <= statusIndex ? "text-purple-600" : ""}>
              {step}
            </span>
          ))}
        </div>
        <div className="mt-2 h-2 rounded-full bg-gray-100">
          <div className="h-2 rounded-full bg-purple-500" style={{ width: `${((statusIndex + 1) / STATUS_STEPS.length) * 100}%` }} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => onCancel(booking.id)}
          className="px-3 py-1 rounded bg-red-50 text-red-700 text-xs"
        >
          Cancel booking
        </button>
      </div>

      <div className="mt-4">
        <label className="text-xs text-gray-500">Request reschedule</label>
        <input
          type="datetime-local"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <button
          onClick={() => onReschedule(booking.id, draft)}
          className="mt-2 text-xs text-purple-600"
        >
          Send reschedule request
        </button>
      </div>
    </div>
  );
}
