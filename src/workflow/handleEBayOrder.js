import dotenv from 'dotenv';
// Ebay
import getEBayOrder from "./getEBayOrder.js";
// Notion
import addNotionPageToDatabase from "../services/notion/add-page-to-database.js";
import addNotionPageToOrderDatabase from "../services/notion/add-page-to-order-database.js";
// 工具
import formatDateYYYYMMDD from "../services/format/formatDateYYYYMMDD.js";
import buildSaleOrders_ebay from '../services/format/buildSaleOrders_ebay.js';
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
            const saleOrders = [];

            // 個別訂單處理
            for (const order of orders) {
                try {
                    const createdDate = formatDateYYYYMMDD(order.creationDate);
                    const shippingDetail = order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo;
                    const items = order.lineItems ?? [];
                    const itemText = items?.length
                        ? items.map(it => `• ${it.title} 〔SKU: ${it.sku ?? "-"}〕* ${it.quantity}`).join("\n")
                        : "";
                    const skuText = items?.length
                        ? items.map(it => `• ${it.sku ?? ""} * ${it.quantity}`).join("\n")
                        : "";

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

                    // 送去組裝資料 Ecount 資料
                    const { SaleOrderList, WH_CD } = await buildSaleOrders_ebay(SESSION_ID, order, createdDate, shippingAddressText, merged);

                    let wh_select = "待判斷"
                    if (WH_CD === "100") {
                        wh_select = "台灣"
                    } else if (WH_CD === "300") {
                        wh_select = "FBA"
                    } else if (WH_CD === "200") {
                        wh_select = "深圳"
                    }

                    saleOrders.push(SaleOrderList);
                    // 送 notion 平台訂單彙整
                    orderList.push({
                        "訂單編號": {
                            type: "title",
                            title: [{ type: "text", text: { content: order.orderId } }],
                        },
                        "出貨倉庫": {
                            type: "select",
                            select: { name: wh_select ? wh_select : "待判斷" }, // 必須與資料庫選項同名
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
                        ` 🎉售出帳號：${order.sellerId}\n🔥訂單編號：${order.orderId}\n🧑‍💼 顧客：${order.buyer?.buyerRegistrationAddress?.fullName ?? ""}\n💵 總金額：${Number(totalValue)}\n📅 日期：${createdDate[0]}\n📦 商品明細：\n${itemText}\n🚚 建議出貨倉庫：${wh_select}`
                    )

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
            await pushMessageToMe(`今天 eBay 共有 ${orderList.length}筆新訂單進來囉：\n${lineMessage.join('\n---\n')}`)

            // 送出到 notion
            console.log("📝 開始新增資料到平台訂單彙整...");
            // console.log(orderList);
            for (let i = 0; i < orderList.length; i++) {
                const res = await addNotionPageToDatabase(orderList[i]);
                if (res) {
                    console.log('✅ 已建立 notion 資料')
                }
            }

            console.log("📝 開始新增資料到訂單...");
            for (let i = 0; i < orderList_orderDatabase.length; i++) {
                const res = await addNotionPageToOrderDatabase(orderList_orderDatabase[i]);
                if (res) {
                    console.log('✅ 已建立 notion 資料')
                }
            }
            // 送出到 Ecount
            const filteredSaleOrders = saleOrders
                .filter(order => Array.isArray(order) && order.length > 0)
                .flat();

            if (filteredSaleOrders.length > 0) {
                console.log(JSON.stringify({ "SaleOrderList": filteredSaleOrders }))
                await saleOrder(SESSION_ID, { "SaleOrderList": filteredSaleOrders });
            } else {
                console.log('沒有訂單可建立，可能出錯了');
            }

        } else {
            console.log("過去 1 小時沒有訂單");
            // await pushMessageToMe(`過去 1 小時 eBay 沒有新訂單`);
        }


    } catch (err) {
        console.error("❌ eBay 訂單處理錯誤：", err?.message || err);
    }
}