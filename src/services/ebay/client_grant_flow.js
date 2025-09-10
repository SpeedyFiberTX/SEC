import axios from 'axios';
import dotenv from "dotenv";

dotenv.config();

// 還不確定要幹嘛用的
const ebay_env = process.env.EBAY_ENV;

// APP資訊
const ebay_client_id = process.env.EBAY_CLIENT_ID;
const ebay_client_secret = process.env.EBAY_CLIENT_SECRET;
const ebay_scopes = process.env.EBAY_SCOPES;

const endpoint = 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';


const credentials = `${ebay_client_id}:${ebay_client_secret}`;
const encoded = Buffer.from(credentials).toString("base64");
const headers = {
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${encoded}`
    },
}



export default async function client_grant_flow() {
    const body = new URLSearchParams();
    body.append("grant_type", "client_credentials");
    body.append("scope", ebay_scopes); // 多個 scope 用空白分隔

    try {
        const response = await axios.post(endpoint, body.toString(), headers);

        console.log(response.data.access_token);

    } catch (err) {
        if (axios.isAxiosError(err)) {
            console.error("[eBay Token Error]", err.response?.status, err.response?.data || err.message);
        } else {
            console.error("[eBay Token Error]", err);
        }
        throw err;
    }
}

client_grant_flow();