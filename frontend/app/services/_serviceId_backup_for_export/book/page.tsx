import ServiceBookingClient from "./ServiceBookingClient";

export const dynamicParams = false;

export async function generateStaticParams() {
  return [];
}

export default function ServiceBookingPage() {
  return <ServiceBookingClient />;
}
