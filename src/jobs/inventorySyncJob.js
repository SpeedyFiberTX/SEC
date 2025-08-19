import cron from 'node-cron';

import syncInventoryByEcount from '../workflow/syncInventoryByEcount.js';

// 每小時執行一次同步流程 =>暫時沒有要用
export default function scheduleInventorySync() {
    cron.schedule('0 * * * *', async () => {
        console.log(`🕒 ${new Date().toLocaleString('zh-TW')} 開始同步 Ecount → Shopify`);
        try {
            const response = await syncInventoryByEcount();
            console.log('✅ 同步完成');
            console.log(`成功執行 ${response.successCount} 個更新，Ecount 總計 ${response.totalCount} 個變體`)

            if (response.shopifyResult?.success === false) {
                console.warn('⚠️ Shopify 寫入失敗');
                if (response.shopifyResult.userErrors) {
                    console.table(response.shopifyResult.userErrors);
                } else {
                    console.error(response.shopifyResult.error);
                }
            } else {
                const changes = response.shopifyResult?.changes || [];
                console.log(`✅ 實際變更數量：${changes.length} 筆`);
                if (changes.length > 0) {
                    console.table(changes);
                }
            }
        } catch (err) {
            console.error('❌ 同步流程整體失敗', err.message);
        }
    });
}
