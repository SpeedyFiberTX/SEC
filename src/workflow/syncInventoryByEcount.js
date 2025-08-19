import runGetVariantsID from "../services/shopify/getVariantsID.js";
import getEcountInventory from "../usecases/getEcountInventory.js";
import runSetInventory from "../services/shopify/setInventory.js";
import getEcountItems from "../usecases/getEcountItems.js";
// 整合Ecount資料並同步到Shopify流程
export default async function syncInventoryByEcount() {
    try {
        const ecountInventory = await getEcountInventory(); //取得產品庫存數量
        const ecountProductList = await getEcountItems(); //取得產品SKU

        // 合併資料
        // const merged = ecountInventory.map(item => {
        //     const product = ecountProductList.find(p => p.PROD_CD === item.PROD_CD);
        //     return {
        //         PROD_CD: item.PROD_CD,
        //         SIZE_DES: product?.SIZE_DES ?? null,
        //         BAL_QTY: item.BAL_QTY
        //     };
        // });

        const merged = ecountProductList.map(p => {
            const inv = ecountInventory.find(item => item.PROD_CD === p.PROD_CD);
            return {
                PROD_CD: p.PROD_CD,
                SIZE_DES: p.SIZE_DES ?? null,
                BAL_QTY: inv ? Number(inv.BAL_QTY) : 0, // 缺值就給 0
            };
        });

        const setQuantities = [];

        for (const item of merged) {
            try {
                const quantity = Number(item.BAL_QTY);
                if (quantity < 0) {
                    console.warn(`⚠️ 負庫存歸零：${item.PROD_CD}（${item.SIZE_DES}），原始庫存 ${quantity}`);
                    quantity = 0;
                }

                const variantsInput = await runGetVariantsID(item.SIZE_DES);
                if (variantsInput) {
                    setQuantities.push({ ...variantsInput, quantity });
                }

            } catch (error) {
                console.log(`查詢Variant失敗`);
            }
        }

        if (setQuantities.length === 0) {
            console.warn('⚠️ 無任何資料可同步至 Shopify');
            return { successCount: 0, totalCount: ecountInventory.length, syncedItems: [] };
        }

        const results = await runSetInventory(setQuantities);

        const successBatches = results.filter(r => r.success).length;
        const failedBatches = results.length - successBatches;
        const totalChanges = results
            .filter(r => r.success && Array.isArray(r.changes))
            .reduce((sum, r) => sum + r.changes.length, 0);
        const noChangeBatches = results.filter(r => r.success && (r.changes ?? []).length === 0).length;

        console.log(`✅ 成功批次：${successBatches}，⚠️ 無變動批次：${noChangeBatches}，❌ 失敗批次：${failedBatches}`);

        return {
            successCount: totalChanges, // ✅ 總共成功變更多少筆庫存
            totalCount: ecountInventory.length,
            syncedItems: setQuantities,
            shopifyResult: {
                batches: results.length,
                successBatches,
                failedBatches,
                totalChanges,
                raw: results, // ⬅ 可選：保留原始所有批次結果
            },
        };

    } catch (error) {
        console.log("❌ 同步流程失敗");
        console.error(error.stack || error.message);
        return {
            successCount: 0,
            totalCount: 0,
            syncedItems: [],
            shopifyResult: { error: error.message },
        };
    }
}