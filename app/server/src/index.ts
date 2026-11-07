import express from "express";
import cors from "cors";
import pool from './db'

const app = express();
app.use(cors());
app.use(express.json());
const PORT = 3000;
app.get("/", (req, res) => {
    res.send("Price Comparison API is running!");
});


app.get("/api/products", async (req, res) => {
    try {
        // Retrieve all saved products from PostgreSQL
        const result = await pool.query(
            "SELECT * FROM products ORDER BY id DESC"
        );

        res.json({
            count: result.rows.length,
            products: result.rows
        });

    } catch (error) {
        console.error("Error retrieving products:", error);

        res.status(500).json({
            error: "Failed to retrieve products"
        });
    }
});

app.get("/api/test-db", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                current_database() AS database,
                current_schema() AS schema,
                current_user AS username
        `);

        res.json(result.rows[0]);

    } catch (error) {
        console.log("Database connection error:", error);
        res.status(500).json({ error: "Database connection failed" });
    }
});

// Search products using Open Food Facts
app.get("/api/openfoodfacts/search", async (req, res) => {
    try {
        const query = req.query.q;

        if (typeof query !== "string" || !query.trim()) {
            return res.status(400).json({
                error: "Please provide a search term"
            });
        }

        const page = Number(req.query.page ?? 1);

        if (!Number.isInteger(page) || page < 1) {
            return res.status(400).json({
                error: "Invalid page number"
            });
        }

        // Build the Open Food Facts search URL
        const url = new URL(
            "https://world.openfoodfacts.net/cgi/search.pl"
        );

        url.searchParams.set("search_terms", query);
        url.searchParams.set("search_simple", "1");
        url.searchParams.set("action", "process");
        url.searchParams.set("json", "1");
        url.searchParams.set("page", String(page));
        url.searchParams.set("page_size", "20");

        // Request product information, including country tags
        url.searchParams.set(
            "fields",
            "code,product_name,brands,image_url,quantity,categories,countries_tags,ingredients_text,nutriments,allergens,nutrition_grades"
        );

        // Automatically restrict results to the United States
        url.searchParams.set("tagtype_0", "countries");
        url.searchParams.set("tag_contains_0", "contains");
        url.searchParams.set("tag_0", "en:united-states");

        // Request products
        const response = await fetch(url, {
            headers: {
                "Authorization": "Basic " +
                    Buffer.from("off:off").toString("base64"),
                "User-Agent": "PriceComparisonApp/1.0 (your-email)"
            }
        });

        if (!response.ok) {
            return res.status(502).json({
                error: "Open Food Facts API unavailable"
            });
        }

        const data = await response.json();

        // Return search results
        res.json({
            count: data.count,
            page: data.page,
            pageSize: data.page_size,
            products: data.products ?? []
        });

    } catch (error) {
        console.error("Product search error:", error);

        res.status(500).json({
            error: "Failed to search products"
        });
    }
});

// Look up a product using its barcode
app.get("/api/openfoodfacts/:barcode", async (req, res) => {
    try {
        const barcode = req.params.barcode;

        // Validate barcode
        if (!/^\d+$/.test(barcode)) {
            return res.status(400).json({
                error: "Invalid barcode"
            });
        }

        // Request product information
        const response = await fetch(
            `https://world.openfoodfacts.net/api/v3.6/product/${barcode}.json?fields=code,product_name,brands,image_url,quantity,categories`,
            {
               headers: {
    "Authorization": "Basic " + Buffer
        .from("off:off")
        .toString("base64"),
    "User-Agent": "PriceComparisonApp/1.0 (lin126904@gmail.com)"
}
            }
        );

        if (!response.ok) {
            return res.status(502).json({
                error: "Open Food Facts API is unavailable"
            });
        }

        const data = await response.json();

        console.log("Open Food Facts response:", data);

        // Check whether the product exists
        if (data.status !== "success" || !data.product){
            return res.status(404).json({
                error: "Product not found"
            });
        }

        // Return selected product information
        res.json({
            barcode: data.product.code,
            name: data.product.product_name,
            brand: data.product.brands,
            image: data.product.image_url,
            size: data.product.quantity,
            category: data.product.categories
        });

    } catch (error) {
        console.error("Open Food Facts error:", error);

        res.status(500).json({
            error: "Something went wrong"
        });
    }
});

app.post("/api/products", async (req, res) => {
    try {
        const {
            barcode,
            name,
            brand,
            image,
            size,
            category
        } = req.body;

        // Check required fields
        if (!barcode || !name) {
            return res.status(400).json({
                error: "Barcode and product name are required"
            });
        }

        // Insert product into PostgreSQL
        const result = await pool.query(
            `INSERT INTO products
                (barcode, name, brand, image_url, size, category)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (barcode) DO NOTHING
             RETURNING *`,
            [
                barcode,
                name,
                brand ?? null,
                image ?? null,
                size ?? null,
                category ?? null
            ]
        );

        // If product already exists, retrieve it
        if (result.rows.length === 0) {
            const existingProduct = await pool.query(
                "SELECT * FROM products WHERE barcode = $1",
                [barcode]
            );

            return res.json({
                message: "Product already exists",
                product: existingProduct.rows[0]
            });
        }

        res.status(201).json({
            message: "Product saved successfully",
            product: result.rows[0]
        });

    } catch (error) {
    console.error("Error saving product:", error);

    res.status(500).json({
        error: error instanceof Error
            ? error.message
            : String(error)
    });
}
    
});
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});