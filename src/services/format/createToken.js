import crypto from "crypto";

// 產生 32 個隨機位元組，轉成 hex
const token = crypto.randomBytes(40).toString("hex").slice(0, 64);
console.log(token); // 長度 64 符合要求