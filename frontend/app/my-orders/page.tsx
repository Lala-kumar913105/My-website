"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price_at_purchase: number;
  listing_id?: number;
  listing_type?: string;
}

interface Order {
  id: number;
  user_id: number;
  total_amount: number;
  status: string;
  created_at: string;
  order_items: OrderItem[];
}

interface TrackingInfo {
  status: string;
  estimated_delivery_minutes?: number;
  updated_at?: string;
}

interface Booking {
  id: number;
  service_id: number;
  listing_id?: number;
  booking_time: string;
  total_amount: number;
  status: string;
  notes?: string | null;
}

const STATUS_STEPS = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
];

const formatStatus = (status: string) => status.replace(/_/g, " ");

export default function MyOrdersPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tracking, setTracking] = useState<Record<number, TrackingInfo>>({});
  const [notifications, setNotifications] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        if (!API) {
          alert("API URL is missing");
          return;
        }

        const profileResponse = await fetch(`${API}/api/v1/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!profileResponse.ok) {
          if (profileResponse.status === 401) {
            localStorage.removeItem("token");
            router.push("/login");
          }
          return;
        }

        const profile = await profileResponse.json();
        const [ordersResponse, bookingsResponse] = await Promise.all([
          fetch(`${API}/api/v1/orders/user/${profile.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API}/api/v1/bookings/user/${profile.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!ordersResponse.ok || !bookingsResponse.ok) {
          if (ordersResponse.status === 401 || bookingsResponse.status === 401) {
            localStorage.removeItem("token");
            router.push("/login");
          }
          return;
        }

        const ordersData: Order[] = await ordersResponse.json();
        const bookingsData: Booking[] = await bookingsResponse.json();
        setOrders(ordersData);
        setBookings(bookingsData);

        if (ordersData.length > 0) {
          const trackingEntries = await Promise.all(
            ordersData.map(async (order) => {
              try {
                const trackResponse = await fetch(`${API}/api/v1/order/track/${order.id}`, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                });
                if (trackResponse.ok) {
                  const trackData = await trackResponse.json();
                  return [order.id, trackData] as [number, TrackingInfo];
                }
              } catch (error) {
                console.error("Tracking fetch failed", error);
              }
              return [order.id, { status: order.status }] as [number, TrackingInfo];
            })
          );
          const trackingMap = Object.fromEntries(trackingEntries);
          setTracking(trackingMap);
          setNotifications(
            ordersData
              .filter((order) => trackingMap[order.id]?.status && trackingMap[order.id].status !== order.status)
              .map((order) => `Order #${order.id} status updated to ${formatStatus(trackingMap[order.id].status)}`)
          );
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [API, router]);

  const orderCards = useMemo(() =>
    orders.map((order) => {
      const trackInfo = tracking[order.id];
      const status = trackInfo?.status || order.status;
      const currentIndex = Math.max(STATUS_STEPS.indexOf(status), 0);
      const displayStatus = formatStatus(status);
      const progressPercent = ((currentIndex + 1) / STATUS_STEPS.length) * 100;

      return (
        <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Order #{order.id}</h3>
              <p className="text-sm text-gray-500">
                {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            <div className="text-sm text-gray-600">Status: {displayStatus}</div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500">
              {STATUS_STEPS.map((step, index) => (
                <span key={step} className={index <= currentIndex ? "text-purple-600" : ""}>
                  {formatStatus(step)}
                </span>
              ))}
            </div>
            <div className="mt-2 h-2 rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-purple-600" style={{ width: `${progressPercent}%` }} />
            </div>
            {trackInfo?.estimated_delivery_minutes && (
              <p className="mt-2 text-xs text-gray-500">
                ETA: {trackInfo.estimated_delivery_minutes} minutes (last update {trackInfo.updated_at ? new Date(trackInfo.updated_at).toLocaleTimeString() : "recently"})
              </p>
            )}
          </div>

          <div className="space-y-2">
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex justify-between text-sm text-gray-700">
                <span>Listing #{item.listing_id ?? item.product_id} × {item.quantity}</span>
                <span>₹{(item.price_at_purchase * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end text-lg font-semibold">
            Total: ₹{order.total_amount.toFixed(2)}
          </div>
        </div>
      );
    }),
    [orders, tracking]
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (orders.length === 0 && bookings.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">My Orders</h1>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600">You have no orders yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">My Orders & Bookings</h1>
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => router.push("/my-bookings")}
            className="rounded-full border border-purple-200 px-4 py-2 text-sm text-purple-700"
          >
            Manage Bookings
          </button>
        </div>

      {notifications.length > 0 && (
        <div className="mb-6 space-y-2">
          {notifications.map((note, index) => (
            <div key={`${note}-${index}`} className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {note}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {orders.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Orders</h2>
            {orderCards}
          </section>
        )}

        {bookings.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Bookings</h2>
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Booking #{booking.id}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(booking.booking_time).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-sm text-gray-600">Status: {booking.status}</div>
                </div>
                <div className="text-sm text-gray-600">Service Listing #{booking.listing_id ?? booking.service_id}</div>
                {booking.notes && (
                  <p className="mt-2 text-sm text-gray-500">Notes: {booking.notes}</p>
                )}
                <div className="mt-4 flex justify-end text-lg font-semibold">
                  Total: ₹{booking.total_amount.toFixed(2)}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}