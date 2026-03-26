"use client";

import Image from "next/image";

interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <div className="border p-4 rounded-lg shadow-lg">
      <Image
        src={product.imageUrl}
        alt={product.name}
        width={200}
        height={200}
        className="w-full h-48 object-cover mb-4 rounded"
        unoptimized
      />

      <h2 className="text-xl font-semibold mb-2">
        {product.name}
      </h2>

      <p className="text-gray-700 mb-4">
        ₹{product.price.toFixed(2)}
      </p>

      <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
        Add to Cart
      </button>
    </div>
  );
};

export default ProductCard;
