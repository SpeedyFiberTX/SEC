// Ecount API
import login from '../services/ecount/login.js';
import getItems from '../services/ecount/getItems.js';
// 取得Ecount庫存資料
export default async function runGetItems(){
    try{
        const SESSION_ID = await login();
        if (!SESSION_ID) throw new Error('SESSION_ID 為空');
        return getItems(SESSION_ID);
    }catch(error){
        console.log(`執行失敗`)
        console.error(error.message)
    }
}