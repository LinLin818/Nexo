import express from "express";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Price Comparison API is running!");
});

app.get("/api/products", (req, res) => {
    res.json([
        {
            id: 1,
            name: "Whole Milk",
            price: 3.49,
            retailer: "Walmart"
        },
        {
            id: 2,
            name: "Whole Milk",
            price: 2.99,
            retailer: "Aldi"
        }
    ]);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});