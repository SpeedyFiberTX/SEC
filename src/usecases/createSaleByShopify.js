import login from "../services/ecount/login";
import saveSales from "../services/ecount/saveSales";

export default async function createSaleByShopify(inputValue) {
    try {
        const SESSION_ID = await login();
        if (!SESSION_ID) throw new Error('SESSION_ID 為空');
        await saveSales(SESSION_ID,inputValue);
    } catch (error) {
        console.log(`執行失敗`)
        console.error(error.message)
    }
}