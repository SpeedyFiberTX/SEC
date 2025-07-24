import axios from 'axios';
import dotenv from "dotenv";

dotenv.config();

// 環境變數
const ZONE = process.env.ECOUNT_ZONE;
const headers = {
    headers: { 'Content-Type': 'application/json' },
}


export default async function getItems(SESSION_ID) {
    try {
        const response = await axios.post(`https://oapi${ZONE}.ecount.com/OAPI/V2/InventoryBasic/GetBasicProductsList?SESSION_ID=${SESSION_ID}`,headers);

        console.log('資料取得成功');
        const productList = response.data.Data.Result;
        const SKUList = productList.map(item => ({PROD_CD:item.PROD_CD,PROD_DES:item.PROD_DES,SIZE_DES:item.SIZE_DES}))
        return SKUList;
    } catch (error) {
        console.log('資料取得失敗');
        console.error(error.message);
    }
}