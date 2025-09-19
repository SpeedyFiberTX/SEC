import axios from 'axios';
import 'dotenv/config';

const BASE = 'https://api.sandbox.ebay.com'; // 用 sandbox
const ORDERS_ENDPOINT = `${BASE}/sell/fulfillment/v1/order`;

export default async function getOrder(accessToken) {
  try {
    const { data } = await axios.get(ORDERS_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      params: {
        // 建議用過去時間，未來時間通常會查不到資料
        // e.g. 最近 30 天：
        // filter: `creationdate:[2025-08-10T00:00:00.000Z..]`
        filter: `creationdate:[2025-09-01T08:25:43.511Z..]`,
        // 可選：limit: 50, offset: 0
      },
    });

    return data; // 會回 orders 陣列等欄位
  } catch (err) {
    console.error(
      '取得訂單失敗:',
      err?.response?.status,
      err?.response?.data || err.message
    );
    throw err;
  }
}