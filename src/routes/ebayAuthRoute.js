import express from 'express';
import dotenv from "dotenv";
import axios from 'axios';
import crypto from 'crypto';

dotenv.config();

// 還不確定要幹嘛用的
// const ebay_env = process.env.EBAY_ENV;

// APP資訊
const ebay_client_id = process.env.EBAY_CLIENT_ID;
// const ebay_client_secret = process.env.EBAY_CLIENT_SECRET;
const ebay_ru_name = process.env.EBAY_RU_NAME;

const endpoint = 'https://auth.sandbox.ebay.com/oauth2/authorize';

// 處理scope
// 從 .env 取出
const rawScopes = process.env.EBAY_SCOPES || "";

// 以空白拆開，去掉空字串
const scopes = rawScopes.split(/\s+/).filter(Boolean);

// 正確組合成一個字串（中間用空白）
const scopeString = scopes.join(" ");
// scope問題結束

// encode 成 eBay 需要的格式（空白 → %20）
const encodedScope = encodeURIComponent(scopeString);

const router = express.Router();

function generateState() {
    return crypto.randomBytes(16).toString("hex");
}

router.get('/login', async (req, res) => {
    const state = generateState();

    const authUrl = `https://auth.sandbox.ebay.com/oauth2/authorize?` +
        `client_id=${encodeURIComponent(ebay_client_id)}` +
        `&redirect_uri=${encodeURIComponent(ebay_ru_name)}` +
        `&response_type=code` +
        `&scope=${encodedScope}` +
        `&state=${encodeURIComponent(state)}`;

    console.log("[authUrl]", authUrl);
    res.redirect(authUrl);

})

router.get('/callback', (req, res) => {
    const { code, state, error, error_description } = req.query;
    console.log('query:', req.query);

    if (error) {
        return res.status(400).send(`OAuth error: ${error} - ${error_description}`);
    }

    res.send(`OK! code=${code}, state=${state}`);
});

export default router;