"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useI18n } from "@/app/i18n/context";

export interface Listing {
  id: number;
  title: string;
  description?: string | null;
  price: number;
  type: "product" | "service" | string;
  stock?: number | null;
  duration_minutes?: number | null;
  seller_id: number;
  image_url?: string | null;
}

interface ListingCardProps {
  listing: Listing;
  onAddToCart?: (listing: Listing) => Promise<void> | void;
  onQuickAction?: (listing: Listing) => Promise<void> | void;
}

const ListingCard = ({ listing, onAddToCart, onQuickAction }: ListingCardProps) => {
  const router = useRouter();
  const { t } = useI18n();
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;
  const imageSrc = listing.image_url ? `${API}${listing.image_url}` : "/default-product.png";

  return (
    <div className="border p-4 rounded-lg shadow-lg bg-white">
      <Image
        src={imageSrc}
        alt={listing.title}
        width={320}
        height={240}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        className="w-full h-48 object-cover mb-4 rounded"
      />
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">{listing.title}</h2>
        <span className="text-xs uppercase tracking-wide text-gray-400">{listing.type}</span>
      </div>
      {listing.description && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-3">{listing.description}</p>
      )}
      <div className="flex flex-wrap gap-2 text-sm text-gray-500 mb-4">
        <span>₹{listing.price.toFixed(2)}</span>
        {listing.type === "product" && listing.stock !== null && listing.stock !== undefined && (
          <span>• Stock {listing.stock}</span>
        )}
        {listing.type === "service" && listing.duration_minutes && (
          <span>• {listing.duration_minutes} min</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {listing.type === "product" ? (
          <button
            onClick={() => onAddToCart?.(listing)}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {t("home.add")}
          </button>
        ) : (
          <button
            onClick={() => {
              onQuickAction?.(listing);
              router.push(`/services/${listing.id}/book?listing=1`);
            }}
            className="flex-1 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            {t("home.bookNow") !== "home.bookNow" ? t("home.bookNow") : "Book Now"}
          </button>
        )}
        <button
          onClick={() => router.push(`/store/${listing.seller_id}`)}
          className="flex-1 border border-gray-200 px-4 py-2 rounded hover:bg-gray-50"
        >
          View Seller
        </button>
      </div>
    </div>
  );
};

export default ListingCard;