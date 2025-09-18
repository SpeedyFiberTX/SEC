import login from "../services/ecount/login.js";
import saleOrder from "../services/ecount/SaleOrder.js";
// import loginTest from "../services/ecount/login_test.js";

// const inputValue = {
//      "SaleOrderList": [{
//         "BulkDatas": {
//         "IO_DATE": ex.createdDate8,
//         "UPLOAD_SER_NO": String(ex.number ?? ex.id),
//         "CUST": "PF002",
//         "CUST_DES": "Shopify",
//         "EMP_CD": "10007",
//         "WH_CD": ex.singleWarehouseId === 81795907814 ? "100" : "200",
//         "IO_TYPE": "13",//交易類型 免稅
//         "EXCHANGE_TYPE": "00002",
//         "EXCHANGE_RATE": "32",
//         "PJT_CD": "",
//         "DOC_NO": "",
//         "TTL_CTT": "",
//         "REF_DES": "",
//         "COLL_TERM": "",
//         "AGREE_TERM": "",
//         "TIME_DATE": "",
//         "REMARKS_WIN": "",
//         "U_MEMO1": "",
//         "U_MEMO2": ex.customerName,
//         "U_MEMO3": "",
//         "U_MEMO4": "",
//         "U_MEMO5": "",
//         "ADD_TXT_01_T": ex.shippingAddress,
//         "ADD_TXT_02_T": "",
//         "ADD_TXT_03_T": "",
//         "ADD_TXT_04_T": "",
//         "ADD_TXT_05_T": "",
//         "ADD_TXT_06_T": "",
//         "ADD_TXT_07_T": "",
//         "ADD_TXT_08_T": "",
//         "ADD_TXT_09_T": "",
//         "ADD_TXT_10_T": "",
//         "ADD_NUM_01_T": "",
//         "ADD_NUM_02_T": "",
//         "ADD_NUM_03_T": "",
//         "ADD_NUM_04_T": "",
//         "ADD_NUM_05_T": "",
//         "ADD_CD_01_T": "",
//         "ADD_CD_02_T": "",
//         "ADD_CD_03_T": "",
//         "ADD_DATE_01_T": "",
//         "ADD_DATE_02_T": "",
//         "ADD_DATE_03_T": "",
//         "U_TXT1": "",
//         "ADD_LTXT_01_T": "",
//         "ADD_LTXT_02_T": "",
//         "ADD_LTXT_03_T": "",
//         "PROD_CD": "M1DX5001RZH-010M",
//         "PROD_DES": "",
//         "SIZE_DES": "",
//         "UQTY": "",
//         "QTY": item.quantity,
//         "PRICE": ex.singleWarehouseId === 81795907814 ? "" : item.price, //單價(美國訂單)
//         "USER_PRICE_VAT": ex.singleWarehouseId === 81795907814 ? item.price : "", //單價含稅(台灣訂單)
//         "SUPPLY_AMT": "",
//         "SUPPLY_AMT_F": "",
//         "VAT_AMT": "",
//         "ITEM_TIME_DATE": "",
//         "REMARKS": "",
//         "ITEM_CD": "",
//         "P_REMARKS1": "",
//         "P_REMARKS2": "",
//         "P_REMARKS3": "",
//         "ADD_TXT_01": "",
//         "ADD_TXT_02": "",
//         "ADD_TXT_03": "",
//         "ADD_TXT_04": "",
//         "ADD_TXT_05": "",
//         "ADD_TXT_06": "",
//         "REL_DATE": "",
//         "REL_NO": "",
//         "P_AMT1": "",
//         "P_AMT2": "",
//         "ADD_NUM_01": "",
//         "ADD_NUM_02": "",
//         "ADD_NUM_03": "",
//         "ADD_NUM_04": "",
//         "ADD_NUM_05": "",
//         "ADD_CD_01": "",
//         "ADD_CD_02": "",
//         "ADD_CD_03": "",
//         "ADD_CD_NM_01": "",
//         "ADD_CD_NM_02": "",
//         "ADD_CD_NM_03": "",
//         "ADD_CDNM_01": "",
//         "ADD_CDNM_02": "",
//         "ADD_CDNM_03": "",
//         "ADD_DATE_01": "",
//         "ADD_DATE_02": "",
//         "ADD_DATE_03": ""
//         }
//         }]
// }

export default async function createEcountSaleOrder(inputValue) {
    try {
        const SESSION_ID = await login();
        if (!SESSION_ID) throw new Error('SESSION_ID 為空');
        await saleOrder(SESSION_ID,inputValue);
    } catch (error) {
        console.log(`執行失敗`)
        console.error(error.message)
    }
}

// createEcountSaleOrder(inputValue);