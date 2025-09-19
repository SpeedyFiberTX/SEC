import axios from "axios";
import "dotenv/config";

const TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";

export async function refreshAccessToken(refreshToken, scopeString) {
  const basic = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString("base64");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    // eBay 要求提供 scope（必須是當初授權的同一組或子集合）
    scope: scopeString,
  });

  const { data } = await axios.post(TOKEN_URL, body.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
  });

  // data 會包含新的 access_token / expires_in（有時也會回新的 refresh_token）
  return data;
}