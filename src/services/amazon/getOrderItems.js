import axios from "axios";

export default async function getOrderItems(access_token, orderId) {
    try {

        if (!access_token) {
            console.log("access_token 不存在");
            return;
        }


        const endpoint = "https://sellingpartnerapi-na.amazon.com"; // 依地區改 NA/EU/FE sandbox https://sandbox.sellingpartnerapi-na.amazon.com
        const url = `${endpoint}/orders/v0/orders/${orderId}/orderItems`;

        const headers = {
            "host": "sellingpartnerapi-na.amazon.com",
            "x-amz-access-token": access_token,
            "x-amz-date": new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''),
            "Content-Type": "application/json",
            "User-Agent": "Inventory & Order Sync/1.0",
        };

        const res = await axios.get(url, { headers });

        // console.log(JSON.stringify(res.data.payload));
        return res.data.payload.OrderItems;


    } catch (err) {
        console.error("Error calling SP-API:", err.response?.data || err.message);
    }
}
