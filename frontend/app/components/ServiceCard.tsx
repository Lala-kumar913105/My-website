"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/app/i18n/context";

interface Service {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  duration_minutes: number;
  category_id?: number | null;
  seller_id: number;
}

interface ServiceCardProps {
  service: Service;
}

const ServiceCard = ({ service }: ServiceCardProps) => {
  const router = useRouter();
  const { t } = useI18n();
  const API = process.env.NEXT_PUBLIC_API_URL;

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
        body: JSON.stringify({ activity_type: activityType, target_id: service.id }),
      });
    } catch (error) {
      console.warn("Activity tracking failed", error);
    }
  };

  return (
    <div className="border p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-2">{service.name}</h2>
      {service.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">{service.description}</p>
      )}
      <div className="flex flex-wrap gap-2 text-sm text-gray-500 mb-4">
        <span>₹{service.price.toFixed(2)}</span>
        <span>• {service.duration_minutes} min</span>
      </div>
      <button
        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 w-full"
        onClick={() => {
          trackActivity("view_service");
          router.push(`/services/${service.id}/book`);
        }}
      >
        {t("home.bookNow") !== "home.bookNow" ? t("home.bookNow") : "Book Now"}
      </button>
    </div>
  );
};

export default ServiceCard;