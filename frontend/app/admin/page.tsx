import React from 'react';

export const dynamic = "force-dynamic";

interface User {
  id: number;
  email: string;
  phone_number: string;
  full_name: string;
  role: 'user' | 'seller' | 'admin' | 'delivery_partner';
  is_active: boolean;
  created_at: string;
}

interface Seller {
  id: number;
  user_id: number;
  business_name: string;
  business_description?: string;
  business_address?: string;
  phone_number?: string;
  website?: string;
  is_approved: boolean;
  created_at: string;
}

interface Order {
  id: number;
  user_id: number;
  total_amount: number;
  status: 'pending' | 'paid' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
  shipping_address?: string;
  created_at: string;
}

interface Analytics {
  total_users: number;
  total_sellers: number;
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  active_sellers: number;
}

interface PageProps {
  searchParams: { [key: string]: string };
}

const AdminDashboardPage: React.FC<PageProps> = async () => {
  const API = process.env.NEXT_PUBLIC_API_URL;
  // Fetch analytics, users, sellers, and orders
  const [analyticsResponse, usersResponse, sellersResponse, ordersResponse] = await Promise.all([
    fetch(`${API}/api/v1/admin/analytics`),
    fetch(`${API}/api/v1/admin/users`),
    fetch(`${API}/api/v1/admin/sellers`),
    fetch(`${API}/api/v1/admin/orders`)
  ]);

  if (!analyticsResponse.ok || !usersResponse.ok || !sellersResponse.ok || !ordersResponse.ok) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-red-600">Failed to load dashboard data</h1>
        <p className="mt-4">Please try again later.</p>
      </div>
    );
  }

  const analytics: Analytics = await analyticsResponse.json();
  const users: User[] = await usersResponse.json();
  const sellers: Seller[] = await sellersResponse.json();
  const orders: Order[] = await ordersResponse.json();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Total Users</h2>
          <p className="text-3xl font-bold">{analytics.total_users}</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Total Sellers</h2>
          <p className="text-3xl font-bold">{analytics.total_sellers}</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Total Orders</h2>
          <p className="text-3xl font-bold">{analytics.total_orders}</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Total Revenue</h2>
          <p className="text-3xl font-bold">₹{analytics.total_revenue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Pending Orders</h2>
          <p className="text-3xl font-bold">{analytics.pending_orders}</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Active Sellers</h2>
          <p className="text-3xl font-bold">{analytics.active_sellers}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Full Name</th>
                <th className="px-4 py-2 text-left">Phone</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Active</th>
                <th className="px-4 py-2 text-left">Created At</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b">
                  <td className="px-4 py-2">{user.id}</td>
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">{user.full_name}</td>
                  <td className="px-4 py-2">{user.phone_number}</td>
                  <td className="px-4 py-2">{user.role}</td>
                  <td className="px-4 py-2">{user.is_active ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2">{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sellers Table */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Sellers</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Business Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Phone</th>
                <th className="px-4 py-2 text-left">Address</th>
                <th className="px-4 py-2 text-left">Website</th>
                <th className="px-4 py-2 text-left">Approved</th>
                <th className="px-4 py-2 text-left">Created At</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map(seller => (
                <tr key={seller.id} className="border-b">
                  <td className="px-4 py-2">{seller.id}</td>
                  <td className="px-4 py-2">{seller.business_name}</td>
                  <td className="px-4 py-2">{seller.phone_number}</td>
                  <td className="px-4 py-2">{seller.business_address}</td>
                  <td className="px-4 py-2">{seller.website}</td>
                  <td className="px-4 py-2">{seller.is_approved ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2">{new Date(seller.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">User ID</th>
                <th className="px-4 py-2 text-left">Total Amount</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Shipping Address</th>
                <th className="px-4 py-2 text-left">Created At</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b">
                  <td className="px-4 py-2">{order.id}</td>
                  <td className="px-4 py-2">{order.user_id}</td>
                  <td className="px-4 py-2">₹{order.total_amount.toFixed(2)}</td>
                  <td className="px-4 py-2">{order.status}</td>
                  <td className="px-4 py-2">{order.shipping_address}</td>
                  <td className="px-4 py-2">{new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;