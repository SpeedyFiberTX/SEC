import dotenv from 'dotenv';

import getEBayOrder from "./getEBayOrder.js";
import addNotionPageToDatabase from "../services/notion/add-page-to-database.js";
import formatDateYYYYMMDD from "../services/format/formatDateYYYYMMDD.js";
import pushMessageToMe from '../services/line/pushMessage.js';

dotenv.config();

const EBAY_TW_STATE = process.env.EBAY_TW_STATE;
const EBAY_US_STATE = process.env.EBAY_US_STATE;

export default async function handleEBayOrder() {

    try {

        const tw_res = await getEBayOrder(EBAY_TW_STATE);
        const us_res = await getEBayOrder(EBAY_US_STATE);
        const tw_orders = tw_res.orders;
        const us_orders = us_res.orders;
        const orders = [...tw_orders, ...us_orders];
        if (orders.length > 0) {

            const orderList = [];
            const lineMessage = [];

            for (const order of orders) {

                const createdDate = formatDateYYYYMMDD(order.creationDate);
                const shippingDetail = order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo;
                const items = order.lineItems;
                const itemText = items?.length
                    ? items.map(it => `• ${it.title} 〔SKU: ${it.sku ?? "-"}〕* ${it.quantity}`).join("\n")
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

                lineMessage.push(
` 🎉售出帳號：${order.sellerId}\n🔥訂單編號：${order.orderId}\n🧑‍💼 顧客：${order.buyer?.buyerRegistrationAddress?.fullName ?? ""}\n💵 總金額：${Number(totalValue)}\n📅 日期：${createdDate[0] }\n📦 商品明細：\n${itemText}`
                )
            }

            // console.log(JSON.stringify(orderList));

            // 送出 Line 訊息
            await pushMessageToMe(`今天 eBay 共有 ${orderList.length}筆新訂單進來囉：\n${lineMessage.join('\n---\n')}`)

            console.log("📝 開始新增資料到平台訂單彙整...");
            // console.log(orderList);
            for (let i = 0; i < orderList.length; i++) {
                const res = await addNotionPageToDatabase(orderList[i]);
                if (res) {
                    console.log('✅ 已建立 notion 資料')
                }
            }



        } else {
            console.log("今天沒有訂單");
            await pushMessageToMe(`今天 eBay 沒有新訂單`);
        }


    } catch (err) {
        console.error("❌ eBay 訂單處理錯誤：", err?.message || err);
    }
}

// handleEBayOrder();