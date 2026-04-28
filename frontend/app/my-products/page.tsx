'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FALLBACK_PRODUCT_IMAGE, resolveProductImageSrc } from '../../lib/image';

const MyProducts = () => {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch products from API
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`${API}/api/v1/listings/seller?listing_type=product`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setProducts(data);
        } else if (response.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
        } else {
          console.error('Failed to fetch products');
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [API, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Listings</h1>
      
      <div className="mb-6">
        <button 
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          onClick={() => router.push('/add-product')}
        >
          Add Listing
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">No Listings</h2>
          <p className="text-gray-500 mb-6">You haven't added any listings yet.</p>
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => router.push('/add-product')}
          >
            Add Listing
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-md p-4">
              <img 
                src={resolveProductImageSrc(product.image_url, API)} 
                alt={product.name} 
                className="w-full h-48 object-cover rounded mb-4"
                onError={(event) => {
                  event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                }}
              />
              <h3 className="text-lg font-semibold mb-2">{product.title ?? product.name}</h3>
              <p className="text-gray-500 mb-2">{product.description}</p>
              <p className="text-xl font-bold mb-4">${product.price}</p>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => router.push(`/add-product?edit=${product.id}`)}
                >
                  Edit
                </button>
                <button 
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  onClick={() => handleDelete(product.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  async function handleDelete(productId: number) {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`${API}/api/v1/listings/${productId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          setProducts(products.filter(product => product.id !== productId));
        } else {
          console.error('Failed to delete product');
        }
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  }
};

export default MyProducts;