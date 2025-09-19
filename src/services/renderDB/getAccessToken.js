// 測試 tokenRepo可不可用
import { getTokenRowByState } from "./tokenRepo.js";

const state = process.argv[2]; // 例如: node src/scripts/getAccessToken.js abcd1234
if (!state) {
  console.error("請提供 state：node src/services/renderDB/getAccessToken.js <state>");
  process.exit(1);
}

const row = await getTokenRowByState(state);

if (!row) {
  console.log("找不到這個 state 的紀錄");
  process.exit(0);
}

console.log("row id:", row.id);
console.log("state:", row.state);
console.log("access_token(安全顯示):", row.access_token.slice(0, 12) + "...");
console.log("access_token_expires_at:", row.access_token_expires_at);
console.log("refresh_token_expires_at:", row.refresh_token_expires_at);
