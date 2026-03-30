"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Slot {
  id: number;
  listing_id?: number;
  service_id?: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const toLocalInput = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

const overlaps = (start: Date, end: Date, slots: Slot[], ignoreId?: number) =>
  slots.some((slot) => {
    if (ignoreId && slot.id === ignoreId) return false;
    const slotStart = new Date(slot.start_time);
    const slotEnd = new Date(slot.end_time);
    return start < slotEnd && end > slotStart;
  });

export default function SlotManagementPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = Number(params?.listingId);
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ start: "", end: "" });
  const [editingId, setEditingId] = useState<number | null>(null);

  const sortedSlots = useMemo(
    () => [...slots].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    [slots]
  );

  const fetchSlots = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);
      const response = await fetch(
        `${API}/api/v1/bookings/slots/listing/${listingId}?start_time=${start.toISOString()}&end_time=${end.toISOString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setSlots(data);
      }
    } catch (err) {
      console.error("Failed to load slots", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Number.isNaN(listingId)) {
      setError("Invalid listing id");
      setLoading(false);
      return;
    }
    fetchSlots();
  }, [listingId]);

  const handleSubmit = async () => {
    if (!draft.start || !draft.end) {
      setError("Start and end time are required");
      return;
    }

    const startDate = new Date(draft.start);
    const endDate = new Date(draft.end);
    if (startDate >= endDate) {
      setError("End time must be after start time");
      return;
    }

    if (overlaps(startDate, endDate, slots, editingId ?? undefined)) {
      setError("Slot overlaps with an existing slot");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const payload = {
        listing_id: listingId,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        is_available: true,
      };

      const response = await fetch(
        editingId ? `${API}/api/v1/bookings/slots/${editingId}` : `${API}/api/v1/bookings/slots`,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        const updated = await response.json();
        setSlots((prev) =>
          editingId ? prev.map((slot) => (slot.id === editingId ? updated : slot)) : [...prev, updated]
        );
        setDraft({ start: "", end: "" });
        setEditingId(null);
        setError(null);
      } else {
        setError("Unable to save slot");
      }
    } catch (err) {
      setError("Unable to save slot");
    }
  };

  const handleDelete = async (slotId: number) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`${API}/api/v1/bookings/slots/${slotId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setSlots((prev) => prev.filter((slot) => slot.id !== slotId));
      }
    } catch (err) {
      console.error("Failed to delete slot", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Manage Slots</h1>
            <p className="text-sm text-gray-500">Listing #{listingId}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600"
          >
            Back
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add / Edit Slot</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Start Time</label>
              <input
                type="datetime-local"
                value={draft.start}
                onChange={(event) => setDraft((prev) => ({ ...prev, start: event.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">End Time</label>
              <input
                type="datetime-local"
                value={draft.end}
                onChange={(event) => setDraft((prev) => ({ ...prev, end: event.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleSubmit}
              className="rounded-full bg-purple-600 px-4 py-2 text-sm text-white"
            >
              {editingId ? "Update Slot" : "Add Slot"}
            </button>
            {editingId && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setDraft({ start: "", end: "" });
                  setError(null);
                }}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Upcoming Slots</h2>
            <button
              onClick={fetchSlots}
              className="text-sm text-purple-600"
            >
              Refresh
            </button>
          </div>
          {loading ? (
            <p className="text-gray-500">Loading slots...</p>
          ) : sortedSlots.length === 0 ? (
            <p className="text-gray-500">No slots created yet.</p>
          ) : (
            <div className="space-y-3">
              {sortedSlots.map((slot) => (
                <div key={slot.id} className="border rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">
                      {new Date(slot.start_time).toLocaleString()} - {new Date(slot.end_time).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Status: {slot.is_available ? "Available" : "Booked"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <button
                      onClick={() => {
                        setEditingId(slot.id);
                        setDraft({ start: toLocalInput(slot.start_time), end: toLocalInput(slot.end_time) });
                        setError(null);
                      }}
                      className="rounded-full border border-gray-200 px-3 py-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(slot.id)}
                      className="rounded-full border border-red-200 px-3 py-1 text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}