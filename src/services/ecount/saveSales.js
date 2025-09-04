import axios from 'axios';
import dotenv from "dotenv";

dotenv.config();

// 環境變數
const ZONE = process.env.ECOUNT_ZONE;
const headers = {
  headers: { 'Content-Type': 'application/json' },
}

export default async function saveSales(SESSION_ID, inputValue) {
  try {
    const response = await axios.post(
      `https://oapi${ZONE}.ecount.com/OAPI/V2/Sale/SaveSale?SESSION_ID=${SESSION_ID}`,
      inputValue,
      headers
    );

    const data = response.data;
    if(data.Status === '200'){
      if (data.Data.SuccessCnt > 0 && data.Data.FailCnt === 0) {
      console.log("✅ 銷貨單建立成功");
      console.log("單據號碼：", data.Data.SlipNos);
    } else {
      console.log("❌ 銷貨單建立失敗");
      console.log("錯誤明細：");
      const resultDetails = data.Data.ResultDetails;
        resultDetails.forEach(item => {
          if (item.Errors) {
            console.log('錯誤項目：', item.TotalError);
            console.log('錯誤原因：', item.Errors);
          }
        })
    }
    }else{
    console.log(data.Error)
    }

  } catch (error) {
    console.log("⚠️ API 呼叫失敗");
    console.log(error.message);
  }
}