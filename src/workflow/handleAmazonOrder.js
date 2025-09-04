import getOrders from "../services/amazon/getOrder.js";
import getAccessToken from "../services/amazon/login.js";
import formatDateYYYYMMDD from "../services/format/formatDateYYYYMMDD.js";
import addNotionPageToDatabase from "../services/notion/add-page-to-database.js";
import getOrderItems from "../services/amazon/getOrderItems.js";

function formatMoney(amount, currency = "USD") {
    // 用 Intl 保險、四捨五入到 2 位
    const n = Number(amount ?? 0);
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

export default async function handleAmazonOrder() {

    try {

        const access_token = await getAccessToken();
        if (!access_token) {
            console.log("access_token 不存在");
            return;
        }

        const Orders = await getOrders(access_token);
        if (Orders.length > 0) {
            // console.log(Orders);

            const orderList = [];

            for (const order of Orders) {

                const createdDate = formatDateYYYYMMDD(order.PurchaseDate);

                // 逐筆抓取訂單明細
                let itemText = "";
                const items = (await getOrderItems(access_token, order.AmazonOrderId)) || [];

                if (items.length > 0) {
                    itemText = items
                        .map((it) => {
                            const title = it.Title ?? "";
                            const sku = it.SellerSKU ?? "";
                            const qty = Number(it.QuantityOrdered ?? 0) || 0;

                            const currency = it?.ItemPrice?.CurrencyCode || "USD";
                            const lineTotal = Number(it?.ItemPrice?.Amount ?? 0);
                            const unitPrice = qty > 0 ? lineTotal / qty : lineTotal;

                            const unitStr = formatMoney(unitPrice, currency);  // @ $7.63
                            const totalStr = formatMoney(lineTotal, currency); // = $7.63

                            return `• ${title} 〔SKU: ${sku}〕 × ${qty} @ ${unitStr} = ${totalStr}`;
                        })
                        .join("\n");
                } else {
                    itemText = "（此訂單目前查無明細或為 Pending 狀態）";
                }


                orderList.push({
                    "訂單編號": {
                        type: "title",
                        title: [{ type: "text", text: { content: order.AmazonOrderId } }],
                    },
                    "出貨倉庫": {
                        type: "select",
                        select: { name: order.FulfillmentChannel === "AFN" ? "FBA" : "深圳", }, // 必須與資料庫選項同名
                    },
                    "平台": {
                        type: "select",
                        select: { name: "Amazon" }, // 必須與資料庫選項同名
                    },
                    "訂單金額": {
                        type: "number",
                        number: Number(order.OrderTotal.Amount),
                    },
                    "訂單日期": {
                        type: "date",
                        date: { start: createdDate[0] },
                    },
                    "商品明細": {
                        type: "rich_text",
                        rich_text: [{ type: "text", text: { content: itemText } }],
                    },
                })
            }

            console.log("📝 開始新增資料到平台訂單彙整...");
            // console.log(orderList);
            for (let i = 0; i < orderList.length; i++) {
                const res = await addNotionPageToDatabase(orderList[i]);
                if (res) {
                    console.log('✅ 已建立 notion 資料')
                }
            }



        } else {
            console.log("今天沒有訂單")
        }


    } catch (err) {
        console.error("❌ Amazon 訂單處理錯誤：", err?.message || err);
    }
}

handleAmazonOrder()