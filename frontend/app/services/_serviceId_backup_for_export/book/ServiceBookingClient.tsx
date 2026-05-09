"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { API_BASE_URL } from "../../../../lib/auth";
import { resolveProductImageSrc } from "../../../../lib/image";

interface ServiceListing {
  id: number;
  title: string;
  description?: string | null;
  price: number;
  duration_minutes?: number | null;
  seller_id: number;
  seller_business_name?: string | null;
  address?: string | null;
  image_url?: string | null;
  type?: string;
}

interface BookingSlot {
  id: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const formatDateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const formatTimeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

export default function BookServicePage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params?.serviceId as string;
  const [service, setService] = useState<ServiceListing | null>(null);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [requestedTime, setRequestedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formattedServiceId = useMemo(() => Number(serviceId), [serviceId]);
  const serviceImage = useMemo(
    () => resolveProductImageSrc(service?.image_url, API_BASE_URL),
    [service?.image_url],
  );

  const slotsGroupedByDate = useMemo(() => {
    const grouped: Record<string, BookingSlot[]> = {};
    slots.forEach((slot) => {
      if (!slot.is_available) return;
      const dayKey = new Date(slot.start_time).toDateString();
      if (!grouped[dayKey]) grouped[dayKey] = [];
      grouped[dayKey].push(slot);
    });
    return Object.entries(grouped).map(([dayKey, daySlots]) => ({
      dayKey,
      label: formatDateLabel(daySlots[0].start_time),
      slots: daySlots,
    }));
  }, [slots]);

  const computedBookingTime = useMemo(() => {
    if (selectedSlot) return selectedSlot;
    if (requestedTime) return new Date(requestedTime).toISOString();
    return "";
  }, [requestedTime, selectedSlot]);

  const bookingSummary = useMemo(() => {
    if (!service) return null;
    if (!computedBookingTime) return null;

    const start = new Date(computedBookingTime);
    const end = new Date(start.getTime() + (service.duration_minutes || 60) * 60000);
    return {
      dateLabel: start.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
      timeLabel: `${formatTimeLabel(start.toISOString())} - ${formatTimeLabel(end.toISOString())}`,
    };
  }, [computedBookingTime, service]);

  const fetchService = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/listings/${formattedServiceId}`);
    if (!response.ok) {
      throw new Error(response.status === 404 ? "Service not found" : "Unable to load service");
    }
    const data: ServiceListing = await response.json();
    if (data.type && data.type !== "service") {
      throw new Error("This listing is not a service");
    }
    setService(data);
  }, [formattedServiceId]);

  const fetchSlots = useCallback(async () => {
    setIsLoadingSlots(true);
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 14);
      const response = await fetch(
        `${API_BASE_URL}/api/v1/bookings/slots/listing/${formattedServiceId}?start_time=${start.toISOString()}&end_time=${end.toISOString()}`,
      );
      if (!response.ok) {
        setSlots([]);
        return;
      }
      const data: BookingSlot[] = await response.json();
      const cleaned = (Array.isArray(data) ? data : [])
        .filter((slot) => new Date(slot.start_time).getTime() > Date.now())
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      setSlots(cleaned);
    } catch {
      setSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [formattedServiceId]);

  const retryLoad = useCallback(async () => {
    setLoadError(null);
    setIsLoadingPage(true);
    await Promise.all([fetchService(), fetchSlots()]).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to load service";
      setLoadError(message);
    });
    setIsLoadingPage(false);
  }, [fetchService, fetchSlots]);

  useEffect(() => {
    const loadData = async () => {
      if (!Number.isFinite(formattedServiceId) || Number.isNaN(formattedServiceId) || formattedServiceId <= 0) {
        setLoadError("Invalid service ID");
        setIsLoadingPage(false);
        setIsLoadingSlots(false);
        return;
      }

      setIsLoadingPage(true);
      setLoadError(null);

      try {
        await Promise.all([fetchService(), fetchSlots()]);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load service";
        setLoadError(message);
        setService(null);
      }
      setIsLoadingPage(false);
    };

    loadData();
  }, [fetchService, fetchSlots, formattedServiceId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!service) return;

    const token = localStorage.getItem("token");
    if (!token) {
      router.push(`/login?next=${encodeURIComponent(`/services/${service.id}/book`)}`);
      return;
    }

    if (!computedBookingTime) {
      setSubmitError(slots.length > 0 ? "Please select an available slot" : "Please choose your preferred time");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/bookings/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listing_id: service.id,
          booking_time: computedBookingTime,
          notes: notes.trim() || undefined,
          buyer_notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        setSubmitError(detail?.detail || "Booking failed. Please try again.");
        return;
      }

      router.push("/my-bookings?from=booking");
    } catch {
      setSubmitError("Booking failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingPage) {
    return (
      <div className="app-shell">
        <div className="app-container space-y-5">
          <div className="ds-card grid gap-5 lg:grid-cols-2">
            <div className="aspect-[4/3] animate-pulse rounded-2xl bg-slate-200" />
            <div className="space-y-3">
              <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
              <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
          <div className="ds-card">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={`slot-skeleton-${index}`} className="h-12 animate-pulse rounded-xl bg-slate-200" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!service || loadError) {
    return (
      <div className="app-shell">
        <div className="app-container">
          <div className="ds-card text-center">
            <h1 className="text-xl font-semibold text-slate-900">{loadError || "Service not found"}</h1>
            <p className="mt-2 text-sm text-slate-600">Please retry or explore other services.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button onClick={retryLoad} className="ds-btn-primary" type="button">
                Retry
              </button>
              <button onClick={() => router.push("/search?type=service")} className="ds-btn-secondary" type="button">
                Browse Services
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
                src={serviceImage}
                alt={service.title}
                fill
                unoptimized
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              Secure booking with clear slot timings and provider confirmation.
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                Service
              </span>
              {service.duration_minutes ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {service.duration_minutes} mins
                </span>
              ) : null}
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{service.title}</h1>
              <p className="mt-2 text-sm text-slate-600">
                {service.description?.trim() || "No service summary provided yet."}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Service Fee</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">₹{service.price.toFixed(2)}</p>
              <p className="mt-2 text-sm text-slate-600">
                Provider: {service.seller_business_name || `Store #${service.seller_id}`}
              </p>
              {service.address && <p className="mt-1 text-sm text-slate-600">Location: {service.address}</p>}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => router.push(`/store/${service.seller_id}`)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                View Seller
              </button>
              <button
                type="button"
                onClick={() => router.push("/my-bookings")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                My Bookings
              </button>
            </div>
          </div>
        </section>

        <section className="ds-card">
          <h2 className="text-lg font-semibold text-slate-900">Select a Time Slot</h2>
          <p className="mt-1 text-sm text-slate-600">
            Choose an available slot below. If no slots are shown, request your preferred time.
          </p>

          {isLoadingSlots ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={`slot-grid-skeleton-${index}`} className="h-12 animate-pulse rounded-xl bg-slate-200" />
              ))}
            </div>
          ) : slotsGroupedByDate.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">No slots available right now.</p>
              <p className="mt-1 text-sm text-slate-600">You can request a preferred time and the provider can confirm it.</p>
              <label className="mt-4 block text-sm font-medium text-slate-700">Preferred date & time</label>
              <input
                type="datetime-local"
                value={requestedTime}
                onChange={(event) => {
                  setRequestedTime(event.target.value);
                  setSelectedSlot("");
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
              />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {slotsGroupedByDate.map((group) => (
                <div key={group.dayKey} className="space-y-2">
                  <p className="text-sm font-semibold text-slate-800">{group.label}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {group.slots.map((slot) => {
                      const isSelected = selectedSlot === slot.start_time;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => {
                            setSelectedSlot(slot.start_time);
                            setRequestedTime("");
                            setSubmitError(null);
                          }}
                          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                            isSelected
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          {formatTimeLabel(slot.start_time)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="ds-card">
          <h2 className="text-lg font-semibold text-slate-900">Booking Notes</h2>
          <p className="mt-1 text-sm text-slate-600">Optional: share any instructions for the provider.</p>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
            placeholder="Add details for a smoother booking experience..."
          />
        </section>

        <section className="ds-card">
          <h2 className="text-lg font-semibold text-slate-900">Booking Summary</h2>
          {bookingSummary ? (
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p>
                <span className="font-medium">Date:</span> {bookingSummary.dateLabel}
              </p>
              <p>
                <span className="font-medium">Time:</span> {bookingSummary.timeLabel}
              </p>
              <p>
                <span className="font-medium">Fee:</span> ₹{service.price.toFixed(2)}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">Select a slot (or preferred time) to see your booking summary.</p>
          )}

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            Easy rescheduling support • Seller confirmation workflow • Secure booking experience
          </div>

          {submitError && (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</p>
          )}

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => router.back()} className="ds-btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {isSubmitting ? "Confirming..." : "Confirm Booking"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}