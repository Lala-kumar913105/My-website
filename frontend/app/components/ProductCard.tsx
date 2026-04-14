"use client";

import Image from "next/image";
import { useI18n } from "../i18n/context";
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  converted_price?: number;
  currency_code?: string;
  stock: number;
  seller_id: number;
  category_id: number;
  image_url?: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  delivery_charge?: number;
  delivery_rate?: number;
  delivery_per_km?: number;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { t } = useI18n();
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;
  const imageSrc = product.image_url ? `${API}${product.image_url}` : "/default-product.png";
  const trackActivity = async (activityType: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !API) return;
      await fetch(`${API}/api/v1/activity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ activity_type: activityType, target_id: product.id }),
      });
    } catch (error) {
      console.warn("Activity tracking failed", error);
    }
  };

  const handleAddToCart = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to add to cart");
        return;
      }

      if (!API) {
        alert("API URL is missing");
        return;
      }

      const profileResponse = await fetch(`${API}/api/v1/users/me`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!profileResponse.ok) {
        if (profileResponse.status === 401) {
          localStorage.removeItem("token");
          alert("Please login again");
        } else {
          alert("Unable to fetch user profile");
        }
        return;
      }

      const profile = await profileResponse.json();
      const response = await fetch(`${API}/api/v1/carts/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: profile.id,
          product_id: product.id,
          quantity: 1,
        }),
      });

      if (response.ok) {
        alert("Added to cart");
        trackActivity("cart_add");
      } else if (response.status === 401) {
        localStorage.removeItem("token");
        alert("Please login again");
      } else {
        alert("Failed to add to cart");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("Error adding to cart");
    }
  };

  const handleAddToWishlist = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to add to wishlist");
        return;
      }

      const response = await fetch(`${API}/api/v1/wishlists/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: product.id }),
      });

      if (response.ok) {
        alert("Product added to wishlist");
      } else if (response.status === 401) {
        localStorage.removeItem("token");
        alert("Please login again");
      } else if (response.status === 400) {
        alert("Product already in wishlist");
      } else {
        alert("Failed to add to wishlist");
      }
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      alert("Error adding to wishlist");
    }
  };

  return (
    <div className="border p-4 rounded-lg shadow-lg">
      <Image
        src={imageSrc}
        alt={product.name}
        width={200}
        height={200}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        className="w-full h-48 object-cover mb-4 rounded"
        onClick={() => trackActivity("view_product")}
      />

      <h2 className="text-xl font-semibold mb-2">{product.name}</h2>

      <p className="text-gray-700 mb-2">
        {product.currency_code || "INR"} {(product.converted_price ?? product.price).toFixed(2)}
      </p>
      {product.original_price !== undefined && product.original_price !== product.converted_price && (
        <p className="text-xs text-gray-500 mb-2">
          Original: ₹{product.original_price.toFixed(2)}
        </p>
      )}

      {typeof product.distance === 'number' && (
        <p className="text-sm text-gray-600 mb-2">Distance: {product.distance} km</p>
      )}

      {typeof product.delivery_charge === 'number' && (
        <p className="text-sm text-gray-600 mb-4">
          Delivery Charge: ₹{product.delivery_charge.toFixed(2)}
        </p>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={handleAddToCart}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex-1"
        >
          {t("home.add")}
        </button>
        <button
          onClick={async () => {
            await handleAddToWishlist();
            trackActivity("wishlist_product");
          }}
          className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 flex-1"
        >
          {t("home.wishlist")}
        </button>
      </div>

      {/* Seller Location Map */}
      {product.latitude && product.longitude && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Seller Location</h3>
          <div className="h-40 rounded-md overflow-hidden border border-gray-300">
            <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={{ lat: product.latitude, lng: product.longitude }}
                zoom={12}
              >
                <Marker
                  position={{ lat: product.latitude, lng: product.longitude }}
                />
              </GoogleMap>
            </LoadScript>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCard;
