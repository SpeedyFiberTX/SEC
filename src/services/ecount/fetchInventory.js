import axios from 'axios';
import dotenv from "dotenv";

dotenv.config();

// 環境變數
const ZONE = process.env.ECOUNT_ZONE;
const headers = {
    headers: { 'Content-Type': 'application/json' },
}

export default async function fetchInventory(SESSION_ID) {

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const inputValue = { "PROD_CD": "", "WH_CD": "", "BASE_DATE": today }

    try {
        const response = await axios.post(`https://oapi${ZONE}.ecount.com/OAPI/V2/InventoryBalance/GetListInventoryBalanceStatus?SESSION_ID=${SESSION_ID}`, inputValue, headers);

        console.log('庫存取得成功');
        const productInventoryList = response.data?.Data?.Result;
        if (!productInventoryList) throw new Error('Inventory 取得失敗');
        console.log(`✅ 庫存取得成功（${productInventoryList.length} 筆）`);
        return productInventoryList;
    } catch (error) {
        console.log('庫存取得失敗')
        console.error(error);
    }
}