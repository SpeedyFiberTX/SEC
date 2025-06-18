// Ecount API
import login from '../services/ecount/login.js';
import fetchInventory from '../services/ecount/fetchInventory.js';
// 取得Ecount庫存資料
export default async function getEcountInventory(){
    try{
        const SESSION_ID = await login();
        if (!SESSION_ID) throw new Error('SESSION_ID 為空，無法取得庫存');
        return fetchInventory(SESSION_ID);
    }catch(error){
        console.log(`執行失敗`)
        console.error(error.message)
    }
}