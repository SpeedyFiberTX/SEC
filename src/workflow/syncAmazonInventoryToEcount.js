// import fs from "fs";

// API
import login from '../services/ecount/login.js';
import fetchInventory from '../services/ecount/getInventoryByStorehouse_FBA.js'
import getItems from '../services/ecount/getItems.js';
import saveSales from "../services/ecount/saveSales.js";
import SavePurchases from "../services/ecount/SavePurchases.js";
import SaveBasicProduct from "../services/ecount/SaveBasicProduct.js";
// API組合
import getFBAInventory from "../usecases/getFBAInventory.js";
// Format
import buildBasicProduct_amazon from "../services/format/buildBasicProduct_amazon.js";
import sortAmazonInventoryData from "../services/format/sortAmazonInventoryData.js";
import buildPurchases_amazon from "../services/format/buildPurchases_amazon.js";
import buildSales_amazon from "../services/format/buildSales_amazon.js";


export default async function syncAmazonInventoryToEcount() {
    try {

        // 登入
        const SESSION_ID = await login();
        if (!SESSION_ID) throw new Error('SESSION_ID 為空');


        const allSummaries = await getFBAInventory(); //取得 FBA 庫存
        const ecountProductList = await getItems(SESSION_ID); //取得 Ecount 產品列表
        const ecountInventory = await fetchInventory(SESSION_ID); //取得 Ecount 產品庫存數量

        // 分類 FBA 庫存
        const { newProducts, existProducts, newSalesProducts, newPurchasesProducts, noChange } = sortAmazonInventoryData(allSummaries, ecountProductList, ecountInventory);


        // 回報有幾個已存在品項
        if(existProducts &&  existProducts.length >0){
            console.log(`ℹ️ 已存在 ${existProducts.length} 個品項`)
        }else{
            console.log("ℹ️ 沒有任何品項存在")
        }

        // 建立新品項
        if (newProducts && newProducts.length > 0) {

            console.log(`ℹ️ 準備建立 ${newProducts.length} 個品項`);

            // ---- 組裝品項資訊 ----
            const productList = buildBasicProduct_amazon(newProducts);

            // ---- 執行建立品項 (每 300 個跑一次) ----
            const chunkSize = 300;
            for (let i = 0; i < productList.length; i += chunkSize) {
                const chunk = productList.slice(i, i + chunkSize);
                if (chunk.length === 0) continue;
                try {
                    console.log(`✅ 準備送出第 ${Math.floor(i / chunkSize) + 1} 批，共 ${chunk.length} 筆資料`);
                    await SaveBasicProduct(SESSION_ID,{ ProductList: chunk });
                } catch (e) {
                    console.error(`❌ 第 ${Math.floor(i / chunkSize) + 1} 批失敗：`, e.response?.data || e.message);
                }
            }
        } else {
            console.log("ℹ️ 沒有新品項需要建立，略過");
        }


        // 建立銷貨單
        if (newSalesProducts && newSalesProducts.length > 0) {
            console.log(`ℹ️ 準備扣除 ${newSalesProducts.length} 個項目庫存`);
            const SaleList = buildSales_amazon(newSalesProducts);
            const saleChunkSize = 300;
            for (let i = 0; i < SaleList.length; i += saleChunkSize) {
                const saleChunk = SaleList.slice(i, i + saleChunkSize);
                if (saleChunk.length === 0) continue;
                try {
                    console.log(`✅ 準備送出銷貨項目第 ${Math.floor(i / saleChunkSize) + 1} 批，共 ${saleChunk.length} 筆資料`);
                    await saveSales(SESSION_ID,{ SaleList: saleChunk });
                } catch (e) {
                    console.error(`❌ 第 ${Math.floor(i / saleChunkSize) + 1} 批失敗：`, e.response?.data || e.message);
                }
            }
        } else {
            console.log("ℹ️ 沒有銷貨項目需要建立，略過");
        }



        // 建立進貨單
        if (newPurchasesProducts && newPurchasesProducts.length > 0) {
            console.log(`ℹ️ 準備新增 ${newPurchasesProducts.length} 個項目庫存`);
            const PurchasesList = buildPurchases_amazon(newPurchasesProducts);
            const purchasesChunkSize = 300;
            for (let i = 0; i < PurchasesList.length; i += purchasesChunkSize) {
                const purchasesChunk = PurchasesList.slice(i, i + purchasesChunkSize);
                if (purchasesChunk.length === 0) continue;
                try {
                    console.log(`✅ 準備送出進貨項目第 ${Math.floor(i / purchasesChunkSize) + 1} 批，共 ${purchasesChunk.length} 筆資料`);
                    await SavePurchases(SESSION_ID,{ PurchasesList: purchasesChunk });
                } catch (e) {
                    console.error(`❌ 第 ${Math.floor(i / purchasesChunkSize) + 1} 批失敗：`, e.response?.data || e.message);
                }
            }
        } else {
            console.log("ℹ️ 沒有進貨項目需要建立，略過");
        }


        // 存成JSON檔方便對照
        // const output = {
        //     newProducts: {
        //         count: newProducts.length,
        //         inventory: newProducts,
        //     }, existProducts: {
        //         count: existProducts.length,
        //         inventory: existProducts,
        //     }, newSalesProducts: {
        //         count: newSalesProducts.length,
        //         inventory: newSalesProducts,
        //     }, newPurchasesProducts: {
        //         count: newPurchasesProducts.length,
        //         inventory: newPurchasesProducts,
        //     }, noChange: {
        //         count: noChange.length,
        //         inventory: noChange,
        //     },


        // };

        // const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        // const filePath = `./inventory-${timestamp}.json`;

        // fs.writeFileSync(filePath, JSON.stringify(output, null, 2), "utf-8");
        // console.log(`✅ Inventory data saved to ${filePath}`);
        // JSON檔邏輯結束


    } catch (err) {
        console.error("同步庫存失敗", err.response?.data || err.message);
    }
}

syncAmazonInventoryToEcount()