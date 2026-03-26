"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Service {
  id: number;
  title?: string;
  name?: string;
  description?: string | null;
  price: number;
  duration_minutes?: number;
  seller_id: number;
  type?: string;
}

export default function BookServicePage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params?.serviceId as string;
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [service, setService] = useState<Service | null>(null);
  const [bookingTime, setBookingTime] = useState("");
  const [notes, setNotes] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedServiceId = useMemo(() => Number(serviceId), [serviceId]);

  useEffect(() => {
    const loadService = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const response = await fetch(`${API}/api/v1/listings/${formattedServiceId}`);
        if (!response.ok) {
          setError("Service not found");
          return;
        }
        const data: Service = await response.json();
        if (data.type && data.type !== "service") {
          setError("Listing is not a service");
          return;
        }
        setService(data);
      } catch (err) {
        setError("Unable to load service");
      } finally {
        setIsLoading(false);
      }
    };

    const loadSlots = async () => {
      try {
        const start = new Date();
        const end = new Date();
        end.setDate(end.getDate() + 7);
        const response = await fetch(
          `${API}/api/v1/bookings/slots/listing/${formattedServiceId}?start_time=${start.toISOString()}&end_time=${end.toISOString()}`
        );
        if (response.ok) {
          const data = await response.json();
          setAvailableSlots(data.map((slot: any) => slot.start_time));
        }
      } catch (error) {
        console.error("Failed to load slots", error);
      }
    };

    if (!Number.isNaN(formattedServiceId)) {
      loadService();
      loadSlots();
    }
  }, [API, formattedServiceId, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!service) return;

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    if (!bookingTime) {
      setError("Please select a booking time");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${API}/api/v1/bookings/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listing_id: service.id,
          booking_time: new Date(bookingTime).toISOString(),
          notes: notes.trim() || undefined,
          buyer_notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        setError("Booking failed. Please try again.");
        return;
      }

      router.push("/my-bookings");
    } catch (err) {
      setError("Booking failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">{error || "Service not found"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-wide text-purple-500">Book service</p>
            <h1 className="text-2xl font-semibold text-gray-900">{service.title ?? service.name}</h1>
            {service.description && (
              <p className="mt-2 text-gray-600">{service.description}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-500">
              <span>₹{service.price.toFixed(2)}</span>
              {service.duration_minutes && <span>• {service.duration_minutes} mins</span>}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose date & time
              </label>
              {availableSlots.length > 0 ? (
                <select
                  value={bookingTime}
                  onChange={(event) => setBookingTime(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none"
                >
                  <option value="">Select a slot</option>
                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {new Date(slot).toLocaleString()}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="datetime-local"
                  value={bookingTime}
                  onChange={(event) => setBookingTime(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes for provider
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none"
                placeholder="Share any special instructions..."
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 hover:border-purple-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-purple-700 disabled:opacity-60"
              >
                {isSubmitting ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}