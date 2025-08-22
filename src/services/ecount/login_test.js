import axios from 'axios';
import dotenv from "dotenv";

dotenv.config();


const COM_CODE = process.env.ECOUNT_COM_CODE;
const USER_ID = process.env.ECOUNT_TEST_USER_ID;
const API_CERT_KEY = process.env.ECOUNT_TEST_API_CERT_KEY;
const LAN_TYPE = process.env.ECOUNT_LAN_TYPE;
const ZONE = process.env.ECOUNT_ZONE;
const headers = {
    headers: { 'Content-Type': 'application/json' },
}

export default async function loginTest() {

    try {
        const response = await axios.post(`https://sboapi${ZONE}.ecount.com/OAPI/V2/OAPILogin`, {
            "COM_CODE": COM_CODE,
            "USER_ID": USER_ID,
            "API_CERT_KEY": API_CERT_KEY,
            "LAN_TYPE": LAN_TYPE,
            "ZONE": ZONE
        }, headers);


        const sessionId = response.data?.Data?.Datas?.SESSION_ID;
        if (!sessionId) throw new Error('SESSION_ID 取得失敗');
        console.log('登入成功');
        return sessionId;

    } catch (error) {
        console.log('登入失敗')
        console.log(error.message);
    }
}