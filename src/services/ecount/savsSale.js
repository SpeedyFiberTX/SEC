import axios from 'axios';
import dotenv from "dotenv";

dotenv.config();

// 環境變數
const ZONE = process.env.ECOUNT_ZONE;
const headers = {
    headers: { 'Content-Type': 'application/json' },
}

// 自訂參數
const SESSION_ID = `3931343432357c57494c4c:IB-ASR!V1yXi4VX3`;
const inputValue = {
    "SaleList": [{
        "BulkDatas": {
            "IO_DATE": "20250617",
            "UPLOAD_SER_NO": "0001",
            "CUST": "",
            "CUST_DES": "",
            "EMP_CD": "",
            "WH_CD": "00009",
            "IO_TYPE": "",
            "EXCHANGE_TYPE": "",
            "EXCHANGE_RATE": "",
            "SITE": "",
            "PJT_CD": "",
            "DOC_NO": "",
            "TTL_CTT": "",
            "U_MEMO1": "20250617",
            "U_MEMO2": "",
            "U_MEMO3": "",
            "U_MEMO4": "",
            "U_MEMO5": "",
            "ADD_TXT_01_T": "",
            "ADD_TXT_02_T": "",
            "ADD_TXT_03_T": "",
            "ADD_TXT_04_T": "",
            "ADD_TXT_05_T": "",
            "ADD_TXT_06_T": "",
            "ADD_TXT_07_T": "",
            "ADD_TXT_08_T": "",
            "ADD_TXT_09_T": "",
            "ADD_TXT_10_T": "",
            "ADD_NUM_01_T": "",
            "ADD_NUM_02_T": "",
            "ADD_NUM_03_T": "",
            "ADD_NUM_04_T": "",
            "ADD_NUM_05_T": "",
            "ADD_CD_01_T": "",
            "ADD_CD_02_T": "",
            "ADD_CD_03_T": "",
            "ADD_DATE_01_T": "",
            "ADD_DATE_02_T": "",
            "ADD_DATE_03_T": "",
            "U_TXT1": "",
            "ADD_LTXT_01_T": "",
            "ADD_LTXT_02_T": "",
            "ADD_LTXT_03_T": "",
            "PROD_CD": "M1DXRBLCULCU2OZH10M",
            "PROD_DES": "test",
            "SIZE_DES": "",
            "UQTY": "",
            "QTY": "1",
            "PRICE": "",
            "USER_PRICE_VAT": "",
            "SUPPLY_AMT": "",
            "SUPPLY_AMT_F": "",
            "VAT_AMT": "",
            "REMARKS": "",
            "ITEM_CD": "",
            "P_REMARKS1": "",
            "P_REMARKS2": "",
            "P_REMARKS3": "",
            "ADD_TXT_01": "",
            "ADD_TXT_02": "",
            "ADD_TXT_03": "",
            "ADD_TXT_04": "",
            "ADD_TXT_05": "",
            "ADD_TXT_06": "",
            "REL_DATE": "20250617",
            "REL_NO": "",
            "MAKE_FLAG": "",
            "CUST_AMT": "",
            "P_AMT1": "",
            "P_AMT2": "",
            "ADD_NUM_01": "",
            "ADD_NUM_02": "",
            "ADD_NUM_03": "",
            "ADD_CD_01": "",
            "ADD_CD_02": "",
            "ADD_CD_03": "",
            "ADD_CD_NM_01": "",
            "ADD_CD_NM_02": "",
            "ADD_CD_NM_03": "",
            "ADD_CDNM_01": "",
            "ADD_CDNM_02": "",
            "ADD_CDNM_03": "",
            "ADD_DATE_01": "",
            "ADD_DATE_02": "",
            "ADD_DATE_03": ""
      }
   }]
}

async function saveSales() {
    try {
        const response = await axios.post(`https://sboapi${ZONE}.ecount.com/OAPI/V2/Sale/SaveSale?SESSION_ID=${SESSION_ID}`,inputValue,headers);

        console.log('資料取得成功');
        console.log(response.data.Data);
        console.log(response.data.Data.ResultDetails[0].Errors);

    } catch (error) {
        console.log('資料取得失敗')
        console.log(error.message);
    }
}

saveSales();