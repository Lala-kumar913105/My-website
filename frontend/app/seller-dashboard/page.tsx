'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SellerDashboard = () => {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;
  const [sellerData, setSellerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryRate, setDeliveryRate] = useState<number>(1.5);
  const [deliveryPerKm, setDeliveryPerKm] = useState<number>(1.5);
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);
  const [listings, setListings] = useState<any[]>([]);
  const [listingFilter, setListingFilter] = useState<'all' | 'product' | 'service'>('all');

  useEffect(() => {
    // Fetch seller data from API
    const fetchSellerData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`${API}/api/v1/sellers/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSellerData(data);
          if (data.delivery_rate) {
            setDeliveryRate(data.delivery_rate);
          }
          if (data.delivery_per_km) {
            setDeliveryPerKm(data.delivery_per_km);
          }
          if (data.latitude !== null && data.latitude !== undefined) {
            setLatitude(data.latitude.toString());
          }
          if (data.longitude !== null && data.longitude !== undefined) {
            setLongitude(data.longitude.toString());
          }
        } else if (response.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
        } else {
          console.error('Failed to fetch seller data');
        }
      } catch (error) {
        console.error('Error fetching seller data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerData();
    fetchSellerOrders();
    fetchAnalytics();
    fetchListings();
  }, []);

  const fetchListings = async (type?: 'product' | 'service' | 'all') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const filter = type && type !== 'all' ? `?listing_type=${type}` : '';
      const response = await fetch(`${API}/api/v1/listings/seller${filter}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setListings(data);
      }
    } catch (error) {
      console.error('Error fetching listings', error);
    }
  };

  const fetchSellerOrders = async (params?: { page?: number; status?: string; search?: string }) => {
    try {
      setOrdersLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const query = new URLSearchParams({
        page: String(params?.page ?? page),
        page_size: String(pageSize),
      });
      if (params?.status ?? statusFilter) {
        query.append('status', params?.status ?? statusFilter);
      }
      if (params?.search ?? searchTerm) {
        query.append('search', params?.search ?? searchTerm);
      }

      const response = await fetch(`${API}/api/v1/seller/orders?${query.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setTotalOrders(data.total || 0);
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching seller orders', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API}/api/v1/seller/analytics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics', error);
    }
  };

  const handleOrderAction = async (orderId: number, action: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API}/api/v1/seller/order-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ order_id: orderId, action }),
      });

      if (response.ok) {
        const data = await response.json();
        setOrders((prev) =>
          prev.map((order) =>
            order.order_id === orderId
              ? { ...order, status: data.status, payment_status: data.payment_status }
              : order
          )
        );
        fetchAnalytics();
        setNotification(`Order #${orderId} updated to ${data.status}`);
        setTimeout(() => setNotification(null), 3000);
      } else {
        alert('Unable to update order');
      }
    } catch (error) {
      console.error('Order update failed', error);
    }
  };

  const handleDeliveryRateUpdate = async () => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const payload: Record<string, number> = {
        delivery_rate: deliveryRate,
        delivery_per_km: deliveryPerKm,
      };

      if (latitude !== '' && !Number.isNaN(Number(latitude))) {
        payload.latitude = parseFloat(latitude);
      }

      if (longitude !== '' && !Number.isNaN(Number(longitude))) {
        payload.longitude = parseFloat(longitude);
      }

      const response = await fetch(`${API}/api/v1/sellers/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setSellerData(data);
        alert('Delivery rate updated successfully');
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        console.error('Failed to update delivery rate');
        alert('Failed to update delivery rate');
      }
    } catch (error) {
      console.error('Error updating delivery rate:', error);
      alert('Error updating delivery rate');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Seller Dashboard</h1>

      {notification && (
        <div className="mb-6 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          {notification}
        </div>
      )}
      
      {sellerData && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Seller Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-medium text-gray-700">Business Name:</label>
              <p className="mt-1">{sellerData.business_name}</p>
            </div>
            <div>
              <label className="font-medium text-gray-700">Business Address:</label>
              <p className="mt-1">{sellerData.business_address}</p>
            </div>
            <div>
              <label className="font-medium text-gray-700">Business Description:</label>
              <p className="mt-1">{sellerData.business_description}</p>
            </div>
            <div>
              <label className="font-medium text-gray-700">Rating:</label>
              <p className="mt-1">{sellerData.rating}</p>
            </div>
            <div>
              <label className="font-medium text-gray-700">Approved:</label>
              <p className="mt-1">{sellerData.approved ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-2">Total Orders</h3>
          <p className="text-2xl font-bold">{analytics?.total_orders ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-2">Total Sales</h3>
          <p className="text-2xl font-bold">₹{analytics?.total_sales ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-2">Total Bookings</h3>
          <p className="text-2xl font-bold">{analytics?.total_bookings ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-2">Total Revenue</h3>
          <p className="text-2xl font-bold">₹{analytics?.total_revenue ?? 0}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
          <div className="space-y-3">
            {(analytics?.revenue_chart || []).map((point: any) => (
              <div key={point.month} className="flex items-center gap-4">
                <span className="w-20 text-sm text-gray-500">{point.month}</span>
                <div className="flex-1 h-3 rounded-full bg-gray-100">
                  <div
                    className="h-3 rounded-full bg-purple-500"
                    style={{ width: `${Math.min(point.value / 1000 * 100, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium">₹{point.value.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Top Products</h3>
          <div className="space-y-3">
            {(analytics?.top_products || []).map((product: any) => (
              <div key={product.id} className="flex justify-between text-sm">
                <span>{product.name}</span>
                <span className="font-medium">{product.quantity}</span>
              </div>
            ))}
            {(!analytics?.top_products || analytics.top_products.length === 0) && (
              <p className="text-sm text-gray-500">No sales yet.</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Top Services</h3>
          <div className="space-y-3">
            {(analytics?.top_services || []).map((service: any) => (
              <div key={service.id} className="flex justify-between text-sm">
                <span>{service.name}</span>
                <span className="font-medium">{service.bookings}</span>
              </div>
            ))}
            {(!analytics?.top_services || analytics.top_services.length === 0) && (
              <p className="text-sm text-gray-500">No bookings yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Low Stock Alerts</h3>
        <div className="space-y-2">
          {(analytics?.low_stock || []).map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.name}</span>
              <span className="text-red-600 font-medium">{item.stock} left</span>
            </div>
          ))}
          {(!analytics?.low_stock || analytics.low_stock.length === 0) && (
            <p className="text-sm text-gray-500">All products are well stocked.</p>
          )}
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Delivery Settings</h2>
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Delivery Rate (₹/km)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={deliveryRate}
            onChange={(e) => setDeliveryRate(parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Delivery Per Km (₹/km)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={deliveryPerKm}
            onChange={(e) => setDeliveryPerKm(parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Latitude
            </label>
            <input
              type="number"
              step="0.000001"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Longitude
            </label>
            <input
              type="number"
              step="0.000001"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        <button
          onClick={handleDeliveryRateUpdate}
          disabled={updating}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {updating ? 'Updating...' : 'Update Delivery Rate'}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          onClick={() => router.push('/add-product')}
        >
          Add Listing
        </button>
        <button
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          onClick={() => router.push('/booking-management')}
        >
          Manage Bookings
        </button>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold">All Listings</h2>
          <div className="flex gap-2">
            {['all', 'product', 'service'].map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  const nextFilter = filter as 'all' | 'product' | 'service';
                  setListingFilter(nextFilter);
                  fetchListings(nextFilter);
                }}
                className={`px-3 py-1 rounded-full text-sm ${
                  listingFilter === filter
                    ? 'bg-purple-600 text-white'
                    : 'border border-gray-200 text-gray-600'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {listings.length === 0 ? (
          <p className="text-gray-500">No listings yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {listings.map((listing) => (
              <div key={listing.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{listing.title}</p>
                    <p className="text-sm text-gray-500">{listing.type}</p>
                  </div>
                  <span className="text-sm font-medium">₹{listing.price}</span>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  {listing.description || 'No description'}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {listing.type === 'product' && (
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                      Stock {listing.stock ?? 0}
                    </span>
                  )}
                  {listing.type === 'service' && (
                    <>
                      <span className="rounded-full bg-purple-50 px-2 py-1 text-purple-700">
                        {listing.duration_minutes ?? 0} min
                      </span>
                      <button
                        onClick={() => router.push(`/seller/slots/${listing.id}`)}
                        className="rounded-full bg-purple-600 px-2 py-1 text-white"
                      >
                        Manage Slots
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10 bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Delivery Orders</h2>
          <button
            className="text-sm text-blue-600 hover:underline"
            onClick={() => fetchSellerOrders({ page: 1 })}
          >
            Refresh
          </button>
        </div>
        <div className="mb-4 flex flex-col md:flex-row gap-3">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by product or buyer"
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            className="px-4 py-2 bg-purple-600 text-white rounded"
            onClick={() => {
              setPage(1);
              fetchSellerOrders({ page: 1, status: statusFilter, search: searchTerm });
            }}
          >
            Apply
          </button>
        </div>
        {ordersLoading ? (
          <p className="text-gray-500">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-gray-500">No orders yet.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.order_id} className="border rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">Order #{order.order_id}</p>
                    <p className="text-sm text-gray-500">Status: {order.status}</p>
                    <p className="text-sm text-gray-500">Payment: {order.payment_status}</p>
                    {order.buyer?.name && (
                      <p className="text-sm text-gray-500">Buyer: {order.buyer.name}</p>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">₹{order.final_amount ?? order.total_amount}</div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-gray-600">
                  {(order.items || []).map((item: any) => (
                    <div key={`${order.order_id}-${item.id}`} className="flex justify-between">
                      <span>{item.name} × {item.quantity}</span>
                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="px-3 py-1 rounded bg-indigo-50 text-indigo-700 text-sm"
                    onClick={() => handleOrderAction(order.order_id, 'confirm')}
                    disabled={order.status !== 'pending'}
                  >
                    Confirm
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-yellow-50 text-yellow-700 text-sm"
                    onClick={() => handleOrderAction(order.order_id, 'prepare')}
                    disabled={order.status !== 'confirmed'}
                  >
                    Preparing
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-blue-50 text-blue-700 text-sm"
                    onClick={() => handleOrderAction(order.order_id, 'out_for_delivery')}
                    disabled={order.status !== 'preparing'}
                  >
                    Out for Delivery
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-green-50 text-green-700 text-sm"
                    onClick={() => handleOrderAction(order.order_id, 'deliver')}
                    disabled={order.status !== 'out_for_delivery'}
                  >
                    Delivered
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-red-50 text-red-700 text-sm"
                    onClick={() => handleOrderAction(order.order_id, 'cancel')}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>Showing {orders.length} of {totalOrders}</span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 rounded border"
              onClick={() => {
                const newPage = Math.max(page - 1, 1);
                setPage(newPage);
                fetchSellerOrders({ page: newPage });
              }}
              disabled={page === 1}
            >
              Previous
            </button>
            <button
              className="px-3 py-1 rounded border"
              onClick={() => {
                const totalPages = Math.ceil(totalOrders / pageSize);
                const newPage = Math.min(page + 1, totalPages || 1);
                setPage(newPage);
                fetchSellerOrders({ page: newPage });
              }}
              disabled={page >= Math.ceil(totalOrders / pageSize)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
