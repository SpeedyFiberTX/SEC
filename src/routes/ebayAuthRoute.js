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
const ebay_scopes = process.env.EBAY_SCOPES;
const ebay_ru_name = process.env.EBAY_RU_NAME;

const endpoint = 'https://auth.sandbox.ebay.com/oauth2/authorize';

const router = express.Router();

function generateState() {
    return crypto.randomBytes(16).toString("hex");
}

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
    console.log(authUrl);
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