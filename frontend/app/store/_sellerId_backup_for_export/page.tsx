import SellerStoreClient from "./SellerStoreClient";

export const dynamicParams = false;

export async function generateStaticParams() {
  return [];
}

export default function SellerStorePage() {
  return <SellerStoreClient />;
}
