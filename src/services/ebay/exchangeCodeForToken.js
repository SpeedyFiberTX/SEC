import axios from 'axios';
import dotenv from "dotenv";

dotenv.config();

// APP資訊
const ebay_client_id = process.env.EBAY_CLIENT_ID;
const ebay_client_secret = process.env.EBAY_CLIENT_SECRET;
const ebay_ru_name = process.env.EBAY_RU_NAME;

const endpoint = 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';


const credentials = `${ebay_client_id}:${ebay_client_secret}`;
const encoded = Buffer.from(credentials).toString("base64");
const headers = {
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${encoded}`
    },
}



export default async function exchangeCodeForToken(code) {
    const body = new URLSearchParams();
    body.append("grant_type", "authorization_code");
    body.append("code", code);
    body.append("redirect_uri", ebay_ru_name); // 多個 scope 用空白分隔

    try {
        const response = await axios.post(endpoint, body.toString(), headers);

        return response.data

    } catch (err) {
        const status = err?.response?.status;
        const payload = err?.response?.data;
        console.error('[eBay exchange error]', status, payload || err.message);
        throw err;
    }
}