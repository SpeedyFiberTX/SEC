import axios from 'axios';
import dotenv from "dotenv";

dotenv.config();

// 環境變數
const ZONE = process.env.ECOUNT_ZONE;
const headers = {
    headers: { 'Content-Type': 'application/json' },
}

// 自訂參數
const SESSION_ID = `3931343432357c57494c4c:IB-ASRpBB2M_kVWu`;
const PROD_CD = "M1DXRBLCULCU2OZH10M";

async function getItem() {
    try {
        const response = await axios.post(`https://sboapi${ZONE}.ecount.com/OAPI/V2/InventoryBasic/ViewBasicProduct?SESSION_ID=${SESSION_ID}`, { "PROD_CD": PROD_CD, "PROD_TYPE": 3 },headers);

        console.log('資料取得成功');
        console.log(response.data.Data);

    } catch (error) {
        console.log('資料取得失敗')
        console.log(error.message);
    }
}

getItem();