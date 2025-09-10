import express from 'express';
import dotenv from "dotenv";
import axios from 'axios';
import crypto from 'crypto';
import client_grant_flow from '../services/ebay/client_grant_flow.js';

dotenv.config();

// 還不確定要幹嘛用的
// const ebay_env = process.env.EBAY_ENV;

// APP資訊
const ebay_client_id = process.env.EBAY_CLIENT_ID;
// const ebay_client_secret = process.env.EBAY_CLIENT_SECRET;
const ebay_scopes = process.env.EBAY_SCOPES;
const ebay_ru_name = process.env.EBAY_RU_NAME;

const endpoint = 'https://auth.sandbox.ebay.com/oauth2/authorize';

const router = express.Router();

function generateState() {
    return crypto.randomBytes(16).toString("hex");
}

// 使用者進入 /ebay/login 被導航到ebay進行授權
router.get('/login', async (req, res) => {
    const state = generateState();

    // const params = new URLSearchParams({
    //     client_id: ebay_client_id,
    //     redirect_uri: ebay_ru_name,
    //     response_type: 'code',
    //     scope: ebay_scopes,
    //     state: state,
    // });

    const authUrl = `${endpoint}?client_id=${ebay_client_id}&response_type=code&redirect_uri=${ebay_ru_name}&scope=${ebay_scopes}&state=${state}`;
    // console.log(authUrl);
    res.redirect(authUrl);

})

// ebay 授權通過後 回傳 code 和 state (剛剛我們傳出去的state)
router.get('/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;
    // console.log('query:', req.query);

    if (error) {
        return res.status(400).send(`OAuth error: ${error} - ${error_description}`);
    }

    try {

        const access_token = await client_grant_flow(code)

        console.log(access_token)

    } catch (err) {
        console.error(
            "get access token error:",
            err?.response?.data || err.message
        );
    }finally{
        res.send(`OK! code=${code}, state=${state}, access token=${access_token}`);
    }

});

export default router;