import SlotManagementClient from "./SlotManagementClient";

export const dynamicParams = false;

export async function generateStaticParams() {
  return [];
}

export default function SlotManagementPage() {
  return <SlotManagementClient />;
}
