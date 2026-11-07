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

        if (!barcode || !name) {
            return res.status(400).json({
                error: "Barcode and product name are required"
            });
        }

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

// Separate retailer-products endpoint
app.post("/api/retailer-products", async (req, res) => {
    const {
        product_id,
        retailer_id,
        product_url,
        match_method
    } = req.body;

    if (!product_id || !retailer_id || !product_url) {
        return res.status(400).json({
            error: "product_id, retailer_id, and product_url are required"
        });
    }

    if (!["barcode", "name_brand_size", "manual"].includes(match_method)) {
        return res.status(400).json({
            error: "Invalid match_method"
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO retailer_products
                (product_id, retailer_id, product_url, match_method)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (product_id, retailer_id) DO NOTHING
             RETURNING *`,
            [product_id, retailer_id, product_url, match_method]
        );

        if (result.rows.length === 0) {
            return res.status(409).json({
                error: "This product is already linked to this retailer"
            });
        }

        res.status(201).json({
            message: "Retailer listing saved for verification",
            retailerProduct: result.rows[0]
        });

    } catch (error) {
        console.error("Error saving retailer listing:", error);

        res.status(500).json({
            error: "Failed to save retailer listing"
        });
    }
});

app.get("/api/retailer-products", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                rp.id,
                p.name AS product_name,
                p.brand,
                p.barcode,
                r.name AS retailer_name,
                rp.product_url,
                rp.match_method,
                rp.is_verified,
                rp.matched_at
            FROM retailer_products rp
            JOIN products p
                ON rp.product_id = p.id
            JOIN retailers r
                ON rp.retailer_id = r.id
            ORDER BY p.name, r.name
        `);

        res.json({
            count: result.rows.length,
            retailerProducts: result.rows
        });

    } catch (error) {
        console.error("Error retrieving retailer products:", error);

        res.status(500).json({
            error: "Failed to retrieve retailer products"
        });
    }
});

//Verifying that the data is true
app.patch("/api/retailer-products/:id/verify", async (req, res) => {
    const id = Number(req.params.id);
    const { product_url, match_method, confirmed } = req.body;

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            error: "Invalid retailer product ID"
        });
    }

    if (confirmed !== true) {
        return res.status(400).json({
            error: "You must confirm that you reviewed this listing"
        });
    }

    if (!product_url || !["barcode", "name_brand_size", "manual"].includes(match_method)) {
        return res.status(400).json({
            error: "A product URL and valid match method are required"
        });
    }

    try {
        const submittedUrl = new URL(product_url);

        if (submittedUrl.protocol !== "https:") {
            return res.status(400).json({
                error: "Product URL must use HTTPS"
            });
        }

        // Retrieve the retailer's official website
        const listing = await pool.query(
            `SELECT rp.id, r.website
             FROM retailer_products rp
             JOIN retailers r ON rp.retailer_id = r.id
             WHERE rp.id = $1`,
            [id]
        );

        if (listing.rows.length === 0) {
            return res.status(404).json({
                error: "Retailer product listing not found"
            });
        }

        const officialHost = new URL(listing.rows[0].website).hostname;
        const submittedHost = submittedUrl.hostname;

        if (
            submittedHost !== officialHost &&
            !submittedHost.endsWith("." + officialHost)
        ) {
            return res.status(400).json({
                error: "URL domain does not match the retailer's official website"
            });
        }

        const result = await pool.query(
            `UPDATE retailer_products
             SET product_url = $1,
                 match_method = $2,
                 is_verified = TRUE,
                 matched_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [product_url, match_method, id]
        );

        res.json({
            message: "Retailer listing verified successfully",
            retailerProduct: result.rows[0]
        });

    } catch (error) {
        console.error("Verification error:", error);

        res.status(400).json({
            error: "Could not verify listing. Check the URL and retailer website."
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
