import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="flex gap-6 bg-black text-white p-4">
      <Link href="/">Home</Link>
      <Link href="/products">Products</Link>
      <Link href="/cart">Cart</Link>
    </nav>
  );
}
