import 'dotenv/config';
import pkg from 'ebay-oauth-nodejs-client';
const EbayAuthToken = pkg;

const isSandbox = (process.env.EBAY_ENV || 'SANDBOX').toUpperCase() === 'SANDBOX';

export const EBAY_ENV = isSandbox ? 'SANDBOX' : 'PRODUCTION';
export const EBAY_API_BASE = isSandbox
  ? 'https://api.sandbox.ebay.com'
  : 'https://api.ebay.com';

export const baseScope = isSandbox
  ? 'https://api.sandbox.ebay.com/oauth/api_scope'
  : 'https://api.ebay.com/oauth/api_scope';

export const scopes = [
  baseScope,
  `${baseScope}/sell.fulfillment.readonly`,
  `${baseScope}/sell.account.readonly`
];

export const oauth = new EbayAuthToken({
  clientId: process.env.EBAY_CLIENT_ID,
  clientSecret: process.env.EBAY_CLIENT_SECRET,
  redirectUri: process.env.EBAY_RU_NAME
});