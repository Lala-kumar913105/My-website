"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ListingCard, { Listing } from '@/app/components/ListingCard';
import useSWR from 'swr';

interface Seller {
  id: number;
  user_id: number;
  business_name: string;
  business_description?: string;
  business_address?: string;
  phone_number?: string;
  website?: string;
  is_approved: boolean;
}

interface PageProps {
  params: { sellerId: string };
}

const SellerStorePage: React.FC<PageProps> = ({ params }) => {
  const router = useRouter();
  const parsedSellerId = parseInt(params.sellerId);
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [seller, setSeller] = useState<Seller | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const { data: sellerData, isLoading: sellerLoading } = useSWR<Seller>(
    API ? `${API}/api/v1/sellers/${parsedSellerId}` : null
  );
  const { data: listingsData = [], isLoading: listingsLoading } = useSWR<Listing[]>(
    API ? `${API}/api/v1/listings?skip=0&limit=200` : null
  );

  const listings = useMemo(
    () => listingsData.filter((listing) => listing.seller_id === parsedSellerId),
    [listingsData, parsedSellerId]
  );

  const loading = sellerLoading || listingsLoading;

  useEffect(() => {
    if (sellerData) {
      setSeller(sellerData);
    }
  }, [sellerData]);

  const handleFollow = async () => {
    const token = localStorage.getItem('token');
    if (!token || !seller) {
      router.push('/login');
      return;
    }

    const endpoint = isFollowing
      ? `${API}/api/v1/profile/follow/${seller.user_id}`
      : `${API}/api/v1/profile/follow/${seller.user_id}`;

    const response = await fetch(endpoint, {
      method: isFollowing ? 'DELETE' : 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      setIsFollowing((prev) => !prev);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-500">Loading seller...</p>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-red-600">Seller not found</h1>
        <p className="mt-4">The seller you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h1 className="text-3xl font-bold mb-2">{seller.business_name}</h1>
        {seller.business_description && (
          <p className="text-gray-600 mb-4">{seller.business_description}</p>
        )}
        <div className="mb-4 flex flex-wrap gap-3">
          <button
            onClick={handleFollow}
            className="rounded-full bg-purple-600 px-4 py-2 text-sm text-white"
          >
            {isFollowing ? 'Unfollow' : 'Follow'}
          </button>
          <button
            onClick={() => router.push('/chat')}
            className="rounded-full border border-purple-200 px-4 py-2 text-sm text-purple-600"
          >
            Message Seller
          </button>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          {seller.business_address && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Address:</span>
              <span>{seller.business_address}</span>
            </div>
          )}
          {seller.phone_number && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Phone:</span>
              <span>{seller.phone_number}</span>
            </div>
          )}
          {seller.website && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Website:</span>
              <a href={seller.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {seller.website}
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Listings</h2>
        {listings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">This seller has no listings available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerStorePage;