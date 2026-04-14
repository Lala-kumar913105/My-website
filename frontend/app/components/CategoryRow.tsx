"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "../i18n/context";

export interface CategoryItem {
  id: number;
  name: string;
  type: "product" | "service" | string;
  icon?: string | null;
  parent_id?: number | null;
}

interface CategoryRowProps {
  categories: CategoryItem[];
  isLoading?: boolean;
}

const CategoryRow = ({ categories, isLoading = false }: CategoryRowProps) => {
  const router = useRouter();
  const { t } = useI18n();

  const productCategories = categories.filter(
    (category) => category.type !== "service"
  );
  const serviceCategories = categories.filter(
    (category) => category.type === "service"
  );

  const handleCategoryClick = (category: CategoryItem) => {
    if (category.type === "service") {
      router.push(`/services?category=${category.id}`);
      return;
    }
    router.push(`/?category=${category.id}`);
  };

  const renderSkeletons = (count = 8) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`category-skeleton-${index}`}
          className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
        >
          <div className="w-12 h-12 rounded-2xl bg-gray-200 animate-pulse mx-auto" />
          <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mt-3 mx-auto" />
        </div>
      ))}
    </div>
  );

  const renderCategoryList = (
    items: CategoryItem[],
    fallbackIcon: string
  ) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
      {items.map((category) => (
        <button
          key={category.id}
          onClick={() => handleCategoryClick(category)}
          className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-purple-200 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          type="button"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-purple-100 via-purple-50 to-indigo-100 text-2xl text-purple-700 shadow-inner transition group-hover:from-purple-200 group-hover:to-indigo-200">
            <span className="drop-shadow-sm">{category.icon || fallbackIcon}</span>
          </div>
          <div className="space-y-1 text-center">
            <span className="text-sm font-semibold text-gray-900">
              {category.name}
            </span>
            <span className="text-xs text-gray-500">Explore</span>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <section className="space-y-12">
      <div className="rounded-[28px] border border-slate-200/70 bg-white p-7 shadow-sm">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Shop Products</h2>
            <p className="text-sm text-gray-500">Discover essentials across every category.</p>
          </div>
        </div>
        {isLoading ? (
          renderSkeletons()
        ) : productCategories.length > 0 ? (
          renderCategoryList(productCategories, "🛍️")
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl">
              🛍️
            </div>
            <p className="text-sm font-medium text-gray-700">{t("home.noProducts")}</p>
            <p className="text-xs text-gray-500">Check back soon for new arrivals.</p>
          </div>
        )}
      </div>
      <div className="rounded-[28px] border border-indigo-100/80 bg-linear-to-br from-white via-white to-indigo-50/80 p-7 shadow-sm">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Book Services</h2>
            <p className="text-sm text-gray-500">Schedule trusted professionals instantly.</p>
          </div>
        </div>
        {isLoading ? (
          renderSkeletons(6)
        ) : serviceCategories.length > 0 ? (
          renderCategoryList(serviceCategories, "🛠️")
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl">
              🛠️
            </div>
            <p className="text-sm font-medium text-gray-700">{t("home.noProducts")}</p>
            <p className="text-xs text-gray-500">We’re onboarding service providers.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default CategoryRow;