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

    const data = response.data.Data;

    if (data.SuccessCnt > 0 && data.FailCnt === 0) {
      console.log("✅ 銷貨單建立成功");
      console.log("單據號碼：", data.SlipNos);
    } else {
      console.log("❌ 銷貨單建立失敗");
      console.log("錯誤明細：");
      data.ResultDetails.forEach((detail, i) => {
        console.log(`Line ${i}:`, detail.TotalError);
        if (detail.Errors?.length > 0) {
          detail.Errors.forEach((err) => {
            console.log(` - 欄位 ${err.ColCd}: ${err.Message}`);
          });
        }
      });
    }
  } catch (error) {
    console.log("⚠️ API 呼叫失敗");
    console.log(error.message);
  }
}