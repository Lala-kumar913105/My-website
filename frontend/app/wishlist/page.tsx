'use client';

import React from 'react';
import ListingCard, { Listing } from '../components/ListingCard';
import { useRouter } from 'next/navigation';
import { useI18n } from '../i18n/context';
import { API_BASE_URL } from '../../lib/auth';

interface WishlistItem {
  id: number;
  user_id: number;
  product_id: number;
  created_at: string;
}

interface PageProps {
  searchParams: { [key: string]: string };
}

const WishlistPage: React.FC<PageProps> = () => {
  const { t } = useI18n();
  const router = useRouter();
  const API = API_BASE_URL;
  const [wishlist, setWishlist] = React.useState<WishlistItem[]>([]);
  const [listings, setListings] = React.useState<Listing[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchWishlist = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch(`${API}/api/v1/wishlists`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('token');
            router.push('/login');
          }
          return;
        }

        const data: WishlistItem[] = await response.json();
        setWishlist(data);

        const listingDetails: Listing[] = await Promise.all(
          data.map(async item => {
            const productResponse = await fetch(`${API}/api/v1/products/${item.product_id}`);
            if (productResponse.ok) {
              const product = await productResponse.json();
              return {
                id: product.id,
                title: product.name,
                description: product.description,
                price: product.price,
                type: 'product',
                stock: product.stock,
                seller_id: product.seller_id,
                image_url: product.image_url,
              } as Listing;
            }
            return null;
          })
        ).then(items => items.filter(Boolean) as Listing[]);

        setListings(listingDetails);
      } catch (error) {
        console.error('Error fetching wishlist:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWishlist();
  }, [router]);

  // Handle remove from wishlist
  const handleRemoveFromWishlist = async (productId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API}/api/v1/wishlists/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Refresh the page to update the wishlist
        window.location.reload();
      } else {
        console.error('Failed to remove from wishlist');
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t('wishlist.title')}</h1>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-2 text-gray-600">Loading wishlist...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">{t('wishlist.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {listings.map(listing => (
            <div key={listing.id} className="relative">
              <ListingCard listing={listing} />
              <button
                onClick={() => handleRemoveFromWishlist(listing.id)}
                className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full hover:bg-red-600 text-sm"
              >
                {t('wishlist.remove')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WishlistPage;