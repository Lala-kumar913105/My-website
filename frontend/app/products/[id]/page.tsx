import ProductDetailClient from "./ProductDetailClient";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!baseUrl) return [];

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/products?skip=0&limit=200`, {
      cache: "no-store",
    });

    if (!response.ok) return [];

    const data = await response.json();
    const products = Array.isArray(data) ? data : [];

    return products
      .map((item) => item?.id)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
      .map((id) => ({ id: String(id) }));
  } catch {
    return [];
  }
}

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  return <ProductDetailClient productId={Number(id)} />;
}
