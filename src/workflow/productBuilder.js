// format tools
import groupByHandle from '../services/format/groupByHandle.js';
import buildProductData from '../services/format/buildProductData.js';

// API
import productCreate from '../services/shopify/productCreate.js';

// 執行
export default async function productBuilder(rows){
        
            try {
                // 按照 handle 組成陣列(同一檔案中如果有多個handle就會被拆成多個陣列)
                const groupedProducts = groupByHandle(rows);

                // 組織產品內容(取陣列中第一筆資料)
                for (const [handle, productRows] of Object.entries(groupedProducts)) {

                    // 準備產品資料
                    const productData = await buildProductData(productRows);
                    console.log(`⏬ 準備上傳 ${handle}`);

                    // 上傳產品
                    const product = await productCreate(productData);
                    console.log(`✅${product.handle}產品建立完成`);

                    console.log('\n'); // 每個產品之間空行區隔
                }

            } catch (error) {
                console.error(`❌ 檔案處理發生錯誤` + error.message)
            }

}