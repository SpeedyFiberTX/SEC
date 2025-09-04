// import login from "../services/ecount/login.js";
import SavePurchases from "../services/ecount/SavePurchases.js";
import login from "../services/ecount/login_test.js";

// const inputValue = {
//      "PurchasesList": [{
//       "BulkDatas": {
//        "ORD_DATE": "",
//        "ORD_NO": "",
//        "IO_DATE": "20250903", //日期
//        "UPLOAD_SER_NO": "3001", //這邊要給個編號
//        "CUST": "10018", //Amazon 庫存同步
//        "CUST_DES": "",
//        "EMP_CD": "",
//        "WH_CD": "300", //FBA 倉庫
//        "IO_TYPE": "",
//        "EXCHANGE_TYPE": "",
//        "EXCHANGE_RATE": "",
//        "SITE": "",
//        "PJT_CD": "",
//        "DOC_NO":"",
//        "U_MEMO1": "",
//        "U_MEMO2": "",
//        "U_MEMO3": "",
//        "U_MEMO4": "",
//        "U_MEMO5": "",
//        "U_TXT1": "",
//        "TTL_CTT": "",
//        "PROD_CD": "TEST", //品項編碼
//        "PROD_DES": "",
//        "SIZE_DES": "",
//        "UQTY": "",
//        "QTY": "1", //新增數量
//        "PRICE": "",
//        "USER_PRICE_VAT": "",
//        "SUPPLY_AMT": "",
//        "SUPPLY_AMT_F": "",
//        "VAT_AMT": "",
//        "REMARKS": "",
//        "ITEM_CD": "",
//        "P_AMT1": "",
//        "P_AMT2": "",
//        "P_REMARKS1": "",
//        "P_REMARKS2": "",
//        "P_REMARKS3": "",
//        "CUST_AMT": ""
//       }
//      },]
// }

export default async function createEcountPurchases(inputValue) {
    try {
        const SESSION_ID = await login();
        if (!SESSION_ID) throw new Error('SESSION_ID 為空');
        await SavePurchases(SESSION_ID,inputValue);
    } catch (error) {
        console.log(`執行失敗`)
        console.error(error.message)
    }
}

// createEcountPurchases(inputValue);