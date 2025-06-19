import axios from 'axios';
import dotenv from "dotenv";

dotenv.config();

// 環境變數
const ZONE = process.env.ECOUNT_ZONE;
const headers = {
    headers: { 'Content-Type': 'application/json' },
}

export default async function saveSales(SESSION_ID,inputValue) {
    try {
        const response = await axios.post(`https://sboapi${ZONE}.ecount.com/OAPI/V2/Sale/SaveSale?SESSION_ID=${SESSION_ID}`,inputValue,headers);

        console.log('銷貨單建立成功');
        console.log(response.data.Data);
        console.log(response.data.Data.ResultDetails[0].Errors);
    } catch (error) {
        console.log('銷貨單建立失敗')
        console.log(error.message);
    }
}