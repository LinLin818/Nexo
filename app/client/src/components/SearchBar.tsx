import React, { useState } from 'react';

interface Product {
    code: string;
    product_name: string;
    brands?: string;
    image_url?: string;
    quantity?: string;
    categories?: string;
}

export const SearchBar: React.FC = () => {
    const [query, setQuery] = useState<string>('');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
    };

    const handleSearch = async () => {
        if (!query.trim()) return;

        try {
            setLoading(true);

            const response = await fetch(
                `http://localhost:3000/api/openfoodfacts/search?q=${encodeURIComponent(query)}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch products');
            }

            const data = await response.json();

            setProducts(data.products);

        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProduct = async (product: Product) => {
    try {
        if (!product.code || !product.product_name) {
            alert("This product is missing a barcode or name.");
            return;
        }

        const response = await fetch("http://localhost:3000/api/products", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                barcode: product.code,
                name: product.product_name,
                brand: product.brands,
                image: product.image_url,
                size: product.quantity,
                category: product.categories
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to save product");
        }

        alert(data.message);

    } catch (error) {
        console.error("Save product error:", error);
        alert("Could not save product.");
    }
};
    return (
        <div style={{ padding: '20px' }}>
            <input
                type="text"
                placeholder="Search for a product..."
                value={query}
                onChange={handleInputChange}
                style={{
                    padding: '8px',
                    width: '250px',
                    marginBottom: '10px'
                }}
            />

            <button onClick={handleSearch}>
                Search
            </button>

            {loading && <p>Searching...</p>}

            <ul>
    {products.map((product) => (
        <li key={product.code}>
            <strong>{product.product_name}</strong>

            <p>Brand: {product.brands || 'Unknown'}</p>
            <p>Size: {product.quantity || 'Unknown'}</p>

            <button onClick={() => handleSaveProduct(product)}>
                Save Product
            </button>
        </li>
    ))}
</ul>
        </div>
    );
};