import dotenv from 'dotenv';
// Ebay
import getEBayOrder from "./getEBayOrder.js";
// Notion
import addNotionPageToDatabase from "../services/notion/add-page-to-database.js";
import addNotionPageToOrderDatabase from "../services/notion/add-page-to-order-database.js";
// 工具
import formatDateYYYYMMDD from "../services/format/formatDateYYYYMMDD.js";
// Line
import pushMessageToMe from '../services/line/pushMessage.js';
import pushMessageToDeveloper from '../services/line/pushMessageToDeveloper.js';
// Ecount
import login from '../services/ecount/login.js';
import saleOrder from '../services/ecount/SaleOrder.js';
import getItems from "../services/ecount/getItems.js";
import fetchInventoryFBA from "../services/ecount/getInventoryByStorehouse_FBA.js";
import fetchInventoryTW from "../services/ecount/getInventoryByStorehouse_TW.js";

dotenv.config();

const EBAY_TW_STATE = process.env.EBAY_TW_STATE;
const EBAY_US_STATE = process.env.EBAY_US_STATE;

export default async function handleEBayOrder() {

    try {
        // 取得兩個帳號的訂單
        const tw_res = await getEBayOrder(EBAY_TW_STATE);
        const us_res = await getEBayOrder(EBAY_US_STATE);
        const tw_orders = tw_res?.orders;
        const us_orders = us_res?.orders;
        const orders = [tw_orders, us_orders]
            .filter(arr => Array.isArray(arr) && arr.length > 0)
            .flat(); // 這裡會把兩個非空的訂單陣列合併成一個

        // 所有訂單處理
        if (orders.length > 0) {

            // 有訂單才登入 Ecount 
            const SESSION_ID = await login();
            if (!SESSION_ID) throw new Error('SESSION_ID 為空');
            // 取得Ecount全產品資料
            const EcountProductList = await getItems(SESSION_ID);
            const EcountInventoryFBA = await fetchInventoryFBA(SESSION_ID); //取得 Ecount FBA 產品庫存數量
            const EcountInventoryTW = await fetchInventoryTW(SESSION_ID); //取得 Ecount TW 產品庫存數量

            const FBAinvByProdCd = new Map(
                (EcountInventoryFBA || []).map(inv => [String(inv.PROD_CD), inv])
            );
            const TWinvByProdCd = new Map(
                (EcountInventoryTW || []).map(inv => [String(inv.PROD_CD), inv])
            );
            const productsByProdCd = new Map(
                (EcountProductList || []).map(p => [String(p.PROD_CD), p])
            );

            // 組合 Ecount 產品SKU+庫存數量（O(n)）
            const merged = [];
            for (const [prodCd, p] of productsByProdCd.entries()) {
                const fbaInv = FBAinvByProdCd.get(prodCd);
                const twInv = TWinvByProdCd.get(prodCd);

                const fbaQty = Number(fbaInv?.BAL_QTY ?? 0) || 0;
                const twQty = Number(twInv?.BAL_QTY ?? 0) || 0;

                merged.push({
                    PROD_CD: prodCd,
                    SIZE_DES: p?.SIZE_DES ?? null,
                    FBA_BAL_QTY: fbaQty,
                    TW_BAL_QTY: twQty,
                    TOTAL_BAL_QTY: fbaQty + twQty,
                });
            }

            // 要準備送去各個平台的資料
            const orderList = [];
            const orderList_orderDatabase = [];
            const lineMessage = [];
            const SaleOrderList = [];

            // 個別訂單處理
            for (const order of orders) {
                try {
                    const createdDate = formatDateYYYYMMDD(order.creationDate);
                    const shippingDetail = order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo;
                    const shippingAddressText = shippingDetail
                        ? [
                            shippingDetail.fullName,
                            shippingDetail.contactAddress?.addressLine1,
                            shippingDetail.contactAddress?.addressLine2, // 可能 undefined
                            shippingDetail.contactAddress?.city,
                            shippingDetail.contactAddress?.stateOrProvince,
                            shippingDetail.contactAddress?.postalCode,
                            shippingDetail.contactAddress?.countryCode,
                        ]
                            .filter(Boolean) // 去掉空值
                            .join(", ")
                        : ""; // 沒有就空字串

                    const totalValue =
                        order.totalFeeBasisAmount?.value ??
                        "0";


                    // 先準備要累積的文字列（改為在 forEach 裡逐筆 push）
                    const items = order.lineItems ?? [];
                    const itemLines = [];
                    const skuLines = [];
                    const invCheckLines = [];
                    const saleOrders = [];

                    // 個別品項處理
                    items?.forEach(item => {

                        const sku = String(item?.sku ?? "");
                        const title = String(item?.title ?? "");
                        const qty = Number(item?.quantity ?? 0);

                        // 累積顯示字串
                        itemLines.push(`• ${title} 〔SKU: ${sku || "-"}〕* ${qty}`);
                        skuLines.push(`• ${sku} * ${qty}`);

                        // 以SKU查詢品項編碼
                        const productDetail = (merged ?? []).find(p => p?.SIZE_DES === sku);

                        const fbaQty = Number(productDetail?.FBA_BAL_QTY ?? 0);
                        const twQty = Number(productDetail?.TW_BAL_QTY ?? 0);

                        // 每個 SKU 的 TW/FBA 庫存檢查列
                        invCheckLines.push(`• ${sku} — TW:${twQty} | FBA:${fbaQty}（需:${qty}）`);


                        // 單價
                        const unitPrice = item.quantity
                            ? Number(item.total?.value ?? 0) / Number(item.quantity)
                            : 0;

                        // 假如品項存在
                        if (productDetail) {
                            saleOrders.push({
                                "BulkDatas": {
                                    "IO_DATE": createdDate[1],
                                    "UPLOAD_SER_NO":String(order.orderId).slice(-4),
                                    "CUST": "PF003",
                                    "CUST_DES": "ebay",
                                    "EMP_CD": "10019",
                                    "WH_CD": "100",
                                    "IO_TYPE": "13",//交易類型 免稅
                                    "EXCHANGE_TYPE": "00002",
                                    "EXCHANGE_RATE": "32",
                                    "PJT_CD": "",
                                    "DOC_NO": "",
                                    "TTL_CTT": "",
                                    "REF_DES": "",
                                    "COLL_TERM": "",
                                    "AGREE_TERM": "",
                                    "TIME_DATE": "",
                                    "REMARKS_WIN": "",
                                    "U_MEMO1": order.orderId,
                                    "U_MEMO2": order.buyer?.buyerRegistrationAddress?.fullName ?? "未知",
                                    "U_MEMO3": "",
                                    "U_MEMO4": "",
                                    "U_MEMO5": "",
                                    "ADD_TXT_01_T": shippingAddressText,
                                    "ADD_TXT_02_T": "",
                                    "ADD_TXT_03_T": "",
                                    "ADD_TXT_04_T": "",
                                    "ADD_TXT_05_T": "",
                                    "ADD_TXT_06_T": "",
                                    "ADD_TXT_07_T": "",
                                    "ADD_TXT_08_T": "",
                                    "ADD_TXT_09_T": "",
                                    "ADD_TXT_10_T": "",
                                    "ADD_NUM_01_T": "",
                                    "ADD_NUM_02_T": "",
                                    "ADD_NUM_03_T": "",
                                    "ADD_NUM_04_T": "",
                                    "ADD_NUM_05_T": "",
                                    "ADD_CD_01_T": "",
                                    "ADD_CD_02_T": "",
                                    "ADD_CD_03_T": "",
                                    "ADD_DATE_01_T": "",
                                    "ADD_DATE_02_T": "",
                                    "ADD_DATE_03_T": "",
                                    "U_TXT1": "",
                                    "ADD_LTXT_01_T": "",
                                    "ADD_LTXT_02_T": "",
                                    "ADD_LTXT_03_T": "",
                                    "PROD_CD": productDetail.PROD_CD, //品項編碼
                                    "PROD_DES": "",
                                    "SIZE_DES": "",
                                    "UQTY": "",
                                    "QTY": qty,
                                    "PRICE": unitPrice, //單價
                                    "USER_PRICE_VAT": "",
                                    "SUPPLY_AMT": "",
                                    "SUPPLY_AMT_F": "",
                                    "VAT_AMT": "",
                                    "ITEM_TIME_DATE": "",
                                    "REMARKS": "",
                                    "ITEM_CD": "",
                                    "P_REMARKS1": "",
                                    "P_REMARKS2": "",
                                    "P_REMARKS3": "",
                                    "ADD_TXT_01": "",
                                    "ADD_TXT_02": "",
                                    "ADD_TXT_03": "",
                                    "ADD_TXT_04": "",
                                    "ADD_TXT_05": "",
                                    "ADD_TXT_06": "",
                                    "REL_DATE": "",
                                    "REL_NO": "",
                                    "P_AMT1": "",
                                    "P_AMT2": "",
                                    "ADD_NUM_01": "",
                                    "ADD_NUM_02": "",
                                    "ADD_NUM_03": "",
                                    "ADD_NUM_04": "",
                                    "ADD_NUM_05": "",
                                    "ADD_CD_01": "",
                                    "ADD_CD_02": "",
                                    "ADD_CD_03": "",
                                    "ADD_CD_NM_01": "",
                                    "ADD_CD_NM_02": "",
                                    "ADD_CD_NM_03": "",
                                    "ADD_CDNM_01": "",
                                    "ADD_CDNM_02": "",
                                    "ADD_CDNM_03": "",
                                    "ADD_DATE_01": "",
                                    "ADD_DATE_02": "",
                                    "ADD_DATE_03": ""
                                }
                            })
                        } else {
                            saleOrders.push({
                                "BulkDatas": {
                                    "IO_DATE": createdDate[1],
                                    "UPLOAD_SER_NO": String(order.orderId).slice(-4),
                                    "CUST": "PF003",
                                    "CUST_DES": "ebay",
                                    "EMP_CD": "10019",
                                    "WH_CD": "100",
                                    "IO_TYPE": "13",//交易類型 免稅
                                    "EXCHANGE_TYPE": "00002",
                                    "EXCHANGE_RATE": "32",
                                    "PJT_CD": "",
                                    "DOC_NO": "",
                                    "TTL_CTT": "",
                                    "REF_DES": "",
                                    "COLL_TERM": "",
                                    "AGREE_TERM": "",
                                    "TIME_DATE": "",
                                    "REMARKS_WIN": "",
                                    "U_MEMO1": order.orderId,
                                    "U_MEMO2": order.buyer?.buyerRegistrationAddress?.fullName ?? "未知",
                                    "U_MEMO3": "",
                                    "U_MEMO4": "",
                                    "U_MEMO5": "",
                                    "ADD_TXT_01_T": shippingAddressText,
                                    "ADD_TXT_02_T": "",
                                    "ADD_TXT_03_T": "",
                                    "ADD_TXT_04_T": "",
                                    "ADD_TXT_05_T": "",
                                    "ADD_TXT_06_T": "",
                                    "ADD_TXT_07_T": "",
                                    "ADD_TXT_08_T": "",
                                    "ADD_TXT_09_T": "",
                                    "ADD_TXT_10_T": "",
                                    "ADD_NUM_01_T": "",
                                    "ADD_NUM_02_T": "",
                                    "ADD_NUM_03_T": "",
                                    "ADD_NUM_04_T": "",
                                    "ADD_NUM_05_T": "",
                                    "ADD_CD_01_T": "",
                                    "ADD_CD_02_T": "",
                                    "ADD_CD_03_T": "",
                                    "ADD_DATE_01_T": "",
                                    "ADD_DATE_02_T": "",
                                    "ADD_DATE_03_T": "",
                                    "U_TXT1": "",
                                    "ADD_LTXT_01_T": "",
                                    "ADD_LTXT_02_T": "",
                                    "ADD_LTXT_03_T": "",
                                    "PROD_CD": "TEST", //品項編碼
                                    "PROD_DES": "",
                                    "SIZE_DES": "",
                                    "UQTY": "",
                                    "QTY": qty,
                                    "PRICE": unitPrice, //單價
                                    "USER_PRICE_VAT": "",
                                    "SUPPLY_AMT": "",
                                    "SUPPLY_AMT_F": "",
                                    "VAT_AMT": "",
                                    "ITEM_TIME_DATE": "",
                                    "REMARKS": "",
                                    "ITEM_CD": "",
                                    "P_REMARKS1": "",
                                    "P_REMARKS2": "",
                                    "P_REMARKS3": "",
                                    "ADD_TXT_01": "",
                                    "ADD_TXT_02": "",
                                    "ADD_TXT_03": "",
                                    "ADD_TXT_04": "",
                                    "ADD_TXT_05": "",
                                    "ADD_TXT_06": "",
                                    "REL_DATE": "",
                                    "REL_NO": "",
                                    "P_AMT1": "",
                                    "P_AMT2": "",
                                    "ADD_NUM_01": "",
                                    "ADD_NUM_02": "",
                                    "ADD_NUM_03": "",
                                    "ADD_NUM_04": "",
                                    "ADD_NUM_05": "",
                                    "ADD_CD_01": "",
                                    "ADD_CD_02": "",
                                    "ADD_CD_03": "",
                                    "ADD_CD_NM_01": "",
                                    "ADD_CD_NM_02": "",
                                    "ADD_CD_NM_03": "",
                                    "ADD_CDNM_01": "",
                                    "ADD_CDNM_02": "",
                                    "ADD_CDNM_03": "",
                                    "ADD_DATE_01": "",
                                    "ADD_DATE_02": "",
                                    "ADD_DATE_03": ""
                                }
                            })
                        }

                    });

                    const itemText = itemLines.join("\n");
                    const skuText = skuLines.join("\n");
                    const invCheckText = invCheckLines.join("\n");

                    // 送 notion 平台訂單彙整
                    orderList.push({
                        "訂單編號": {
                            type: "title",
                            title: [{ type: "text", text: { content: order.orderId } }],
                        },
                        "出貨倉庫": {
                            type: "select",
                            select: { name: "待判斷" }, // 必須與資料庫選項同名
                        },
                        "平台": {
                            type: "select",
                            select: { name: "eBay" }, // 必須與資料庫選項同名
                        },
                        "客戶名稱": {
                            type: "rich_text",
                            rich_text: [{ type: "text", text: { content: order.buyer?.buyerRegistrationAddress?.fullName ?? "" } }],
                        },
                        "Email": {
                            type: "email",
                            email: order.buyer?.buyerRegistrationAddress?.email ?? null,
                        },
                        "聯絡電話": {
                            type: "phone_number",
                            phone_number: order.buyer?.buyerRegistrationAddress?.primaryPhone?.phoneNumber ?? null,
                        },
                        "配送地址": {
                            type: "rich_text",
                            rich_text: [{ type: "text", text: { content: shippingAddressText } },],
                        },
                        "訂單金額": {
                            type: "number",
                            number: Number(totalValue),
                        },
                        "訂單日期": {
                            type: "date",
                            date: { start: createdDate[0] },
                        },
                        "商品明細": {
                            type: "rich_text",
                            rich_text: [{ type: "text", text: { content: itemText } }],
                        },
                        "備註": {
                            type: "rich_text",
                            rich_text: [{ type: "text", text: { content: `售出帳號：${order.sellerId}` } }],
                        },
                    })
                    // 送 notion 訂單
                    orderList_orderDatabase.push({
                        "Name": {
                            type: "title",
                            title: [{ type: "text", text: { content: order.buyer?.buyerRegistrationAddress?.fullName ?? "" } }],
                        },
                        "平台": {
                            type: "select",
                            select: { name: order.sellerId === "speedyfibertx" ? "ebay(TW)" : "ebay(USA)" }, // 必須與資料庫選項同名
                        },
                        "價格(稅內)": {
                            type: "number",
                            number: Number(totalValue),
                        },
                        "Order Date": {
                            type: "date",
                            date: { start: createdDate[0] },
                        },
                        // 新增：商品明細（rich_text 多行）
                        "品項": {
                            type: "rich_text",
                            rich_text: [{ type: "text", text: { content: itemText } }],
                        },
                        "SKU": {
                            type: "rich_text",
                            rich_text: [{ type: "text", text: { content: skuText } }],
                        },
                    })
                    // 送 line
                    lineMessage.push(
                        ` 🎉售出帳號：${order.sellerId}\n🔥訂單編號：${order.orderId}\n🧑‍💼 顧客：${order.buyer?.buyerRegistrationAddress?.fullName ?? ""}\n💵 總金額：${Number(totalValue)}\n📅 日期：${createdDate[0]}\n📦 商品明細：\n${itemText}\n🚚 庫存檢查：\n${invCheckText}`
                    )
                    // 送Ecount
                    SaleOrderList.push(...saleOrders);

                } catch (err) {
                    console.error(`處理訂單 ${order?.orderId ?? '未知'} 失敗:`, err.message);
                    try {
                        await pushMessageToDeveloper(`eBay 同步訂單：${order?.orderId ?? '未知'} 失敗`)
                    } catch (error) {
                        console.error(`傳送訊息失敗`);
                    }
                }
            }

            // 送出 Line 訊息
            await pushMessageToMe(`過去 1 小時 eBay 共有 ${orderList.length}筆新訂單進來囉：\n${lineMessage.join('\n---\n')}`)
            // await pushMessageToDeveloper(`過去 1 小時 eBay 共有 ${orderList.length}筆新訂單進來囉：\n${lineMessage.join('\n---\n')}`)

            // 送出到 notion
            console.log("📝 開始新增資料到平台訂單彙整...");
            try {
                for (let i = 0; i < orderList.length; i++) {
                    const res = await addNotionPageToDatabase(orderList[i]);
                    if (res) {
                        console.log('✅ 已建立 notion 資料')
                    }
                }
            } catch (error) {
                console.error("❌ 新增資料到 notion 平台訂單彙整 出錯了：", err?.message || err);
            }

            console.log("📝 開始新增資料到訂單...");
            try {
                for (let i = 0; i < orderList_orderDatabase.length; i++) {
                    const res = await addNotionPageToOrderDatabase(orderList_orderDatabase[i]);
                    if (res) {
                        console.log('✅ 已建立 notion 資料')
                    }
                }
            } catch (error) {
                console.error("❌ 新增資料到 notion 訂單 出錯了：", err?.message || err);
            }

            // 送出到 Ecount
            console.log("📝 開始建立 Ecount 訂貨單...");
            console.log(JSON.stringify({ "SaleOrderList": SaleOrderList }));
            try {
                if (SaleOrderList.length > 0) {
                    await saleOrder(SESSION_ID, { "SaleOrderList": SaleOrderList });
                } else {
                    console.log('沒有訂單可建立，可能出錯了');
                }
            } catch (error) {
                console.error("❌ 建立 Ecount 訂貨單出錯了：", err?.message || err);
            }
            

        } else {
            console.log("過去 1 小時沒有訂單");
            // await pushMessageToMe(`過去 1 小時 eBay 沒有新訂單`);
        }


    } catch (err) {
        console.error("❌ eBay 訂單處理錯誤：", err?.message || err);
    }
}