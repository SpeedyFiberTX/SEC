import { getValidAccessTokenByState } from "../services/ebay/getValidAccessToken.js";
import getOrder from '../services/ebay/getOrder.js'
// import dotenv from 'dotenv';
// dotenv.config();
// const EBAY_STATE = process.env.EBAY_STATE;

export default async function getEBayOrder(state) {
  try {

    const accessToken = await getValidAccessTokenByState(state);
    const response = await getOrder(accessToken);

    console.log(response);
    
  } catch (err) {
    console.error("❌ eBay 訂單取得錯誤：", err?.response?.data || err.message);
    throw err;
  }
}

// getEBayOrder(EBAY_STATE);