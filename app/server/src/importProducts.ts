
import pool from "./db";

interface OFFProduct {
    code?: string;
    product_name?: string;
    brands?: string;
    image_url?: string;
    quantity?: string;
    categories?: string;
}

const searchTerms = [
    "milk",
    "cheese",
    "yogurt",
    "bread",
    "eggs",
    "apples",
    "chicken",
    "rice",
    "pasta",
    "cereal",
    "juice",
    "snacks"
];

const MAX_PRODUCTS = 500;

async function importProducts() {
    let imported = 0;

    try {
        for (const term of searchTerms) {
            if (imported >= MAX_PRODUCTS) break;

            console.log(`Searching for: ${term}`);

            const url = new URL(
                "https://world.openfoodfacts.net/cgi/search.pl"
            );

            url.searchParams.set("search_terms", term);
            url.searchParams.set("search_simple", "1");
            url.searchParams.set("action", "process");
            url.searchParams.set("json", "1");
            url.searchParams.set("page_size", "100");
            url.searchParams.set("fields",
                "code,product_name,brands,image_url,quantity,categories,countries_tags"
            );

            url.searchParams.set("tagtype_0", "countries");
            url.searchParams.set("tag_contains_0", "contains");
            url.searchParams.set("tag_0", "en:united-states");

            const response = await fetch(url, {
                headers: {
                    "Authorization": "Basic " +
                        Buffer.from("off:off").toString("base64"),
                    "User-Agent": "PriceComparisonApp/1.0"
                }
            });

            if (!response.ok) {
                console.error(`Search failed for ${term}`);
                continue;
            }

            const data = await response.json();
            const products: OFFProduct[] = data.products ?? [];

            for (const product of products) {
                if (imported >= MAX_PRODUCTS) break;

                // Skip products without a name or barcode
                if (!product.code || !product.product_name?.trim()) {
                    continue;
                }

                // Save product without creating duplicates
                const result = await pool.query(
                    `INSERT INTO products
                        (barcode, name, brand, image_url, size, category)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (barcode) DO NOTHING
                     RETURNING id`,
                    [
                        product.code,
                        product.product_name,
                        product.brands ?? null,
                        product.image_url ?? null,
                        product.quantity ?? null,
                        product.categories ?? null
                    ]
                );

                if (result.rows.length > 0) {
                    imported++;
                }
            }

            console.log(`Imported so far: ${imported}`);

            // Stay below the API's search request limit
            await new Promise(resolve => setTimeout(resolve, 6500));
        }

        console.log(`Import completed! Total imported: ${imported}`);

    } catch (error) {
        console.error("Import error:", error);
    } finally {
        await pool.end();
    }
}

importProducts();
