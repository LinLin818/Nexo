export async function getProducts(){
    const response = await fetch(
        "http://localhost:3000/api/products"
    );

    if(!response.ok){
        throw new Error("Failed receive products");
    }

    return response.json();
} 