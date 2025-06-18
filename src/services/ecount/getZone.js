
import axios from 'axios';
import dotenv from "dotenv";

dotenv.config();

const COM_CODE = process.env.ECOUNT_COM_CODE;
const headers = {
    headers: { 'Content-Type': 'application/json' },
}

async function getZone() {
    try {
        const response = await axios.post("https://oapi.ecount.com/OAPI/V2/Zone", {
            "COM_CODE": COM_CODE
        },headers);

        console.log('資料取得成功');
        console.log(response);

    }catch(error){
        console.log('資料取得失敗')
        console.log(error.message);
    }
}

getZone();