
import React, { useEffect, useState } from "react";

interface Product {
    id: number;
    name: string;
    brand: string;
    barcode: string;
    size: string;
    category: string;
    image_url: string | null;
}

const MyProducts = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await fetch(
                    "http://localhost:3000/api/products"
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch products");
                }

                const data = await response.json();
                setProducts(data.products);

            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    if (loading) {
        return <p>Loading products...</p>;
    }

    return (
        <div>
            <h2>My Products</h2>

            {products.length === 0 ? (
                <p>No saved products yet.</p>
            ) : (
                <div className="product-grid">
                    {products.map((product) => (
                        <div key={product.id} className="product-card">

                            
<img
    src={
        product.image_url ||
        "https://placehold.co/150x150?text=No+Image"
    }
    alt={product.name}
    width="150"
    height="150"
    onError={(event) => {
        event.currentTarget.src =
            "https://placehold.co/150x150?text=No+Image";
    }}
/>


                            <h3>{product.name}</h3>
                            <p>Brand: {product.brand}</p>
                            <p>Size: {product.size}</p>
                            <p>Category: {product.category}</p>

                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyProducts;
