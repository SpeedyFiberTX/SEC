import axios from 'axios';
import dotenv from "dotenv";

dotenv.config();

// 環境變數
const CLIENT_ID = process.env.AMAZON_CLIENT_ID;
const CLIENT_SECRET = process.env.AMAZON_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.AMAZON_REFRESH_TOKEN;
//Sandbox
// const CLIENT_ID = process.env.AMAZON_SANDBOX_CLIENT_ID;
// const CLIENT_SECRET = process.env.AMAZON_SANDBOX_CLIENT_SECRET;
// const REFRESH_TOKEN = process.env.AMAZON_SANDBOX_REFRESH_TOKEN;


export default async function getAccessToken() {
  try {
    const data = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
    });

    const res = await axios.post(
      'https://api.amazon.com/auth/o2/token',//Sandbox https://sandbox.sellingpartnerapi-na.amazon.com (北美)
      data, // ← 放在 body
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    // console.log(res.data); // { access_token, token_type, expires_in }
    return res.data.access_token;
  }catch (err) {
        console.error("Error calling SP-API:", err.response?.data || err.message);
    }
  
}