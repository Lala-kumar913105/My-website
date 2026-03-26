"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Seller {
  id: number;
  business_name: string;
  business_address?: string | null;
}

interface Product {
  id: number;
  name: string;
  price: number;
  image_url?: string;
}

interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  product?: Product;
  seller?: Seller | null;
}

interface Cart {
  id: number;
  user_id: number;
  items: CartItem[];
}

export default function CartPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    const fetchCart = async () => {
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
        const cartResponse = await fetch(`${API}/api/v1/cart/${profile.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!cartResponse.ok) {
          if (cartResponse.status === 401) {
            localStorage.removeItem("token");
            router.push("/login");
          }
          return;
        }

        const cartData: Cart = await cartResponse.json();
        setCart(cartData);
      } catch (error) {
        console.error("Error fetching cart:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [API, router]);

  const totalAmount = useMemo(() => {
    if (!cart) return 0;
    return cart.items.reduce((sum, item) => {
      const price = item.product?.price ?? 0;
      return sum + price * item.quantity;
    }, 0);
  }, [cart]);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    router.push('/checkout');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Cart</h1>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600">Your cart is empty.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Cart</h1>

      <div className="space-y-4">
        {cart.items.map((item) => {
          const product = item.product;
          return (
            <div
              key={item.id}
              className="flex items-center justify-between bg-white rounded-lg shadow-md p-4"
            >
              <div className="flex items-center gap-4">
                <img
                  src={product?.image_url ? `${API}${product.image_url}` : "/default-product.png"}
                  alt={product?.name || "Product"}
                  className="w-20 h-20 object-cover rounded"
                />
                <div>
                  <h3 className="text-lg font-semibold">{product?.name || "Product"}</h3>
                  <p className="text-gray-500">Qty: {item.quantity}</p>
                  {item.seller?.business_name && (
                    <p className="text-xs text-gray-400">Sold by {item.seller.business_name}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">₹{((product?.price ?? 0) * item.quantity).toFixed(2)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 bg-white rounded-lg shadow-md p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xl font-semibold">Total: ₹{totalAmount.toFixed(2)}</p>
          <p className="text-sm text-gray-500">Proceed to checkout for payment and delivery options</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {checkoutLoading ? "Redirecting..." : "Go to Checkout"}
          </button>
        </div>
      </div>
    </div>
  );
}