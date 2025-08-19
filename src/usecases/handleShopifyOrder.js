// import createSaleByShopify from "./createSaleByShopify";
import addNotionPageToDatabase from "../services/notion/add-page-to-database.js"

export default async function handleShopifyOrder(order) {
  try {
    console.log(order);
    console.log('🛒 處理新訂單：', order.name || order.id);

    // 🔍 基本資訊
    const customerName = `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim();
    const total = order.total_price;
    const items = order.line_items.map(item => ({
      title: item.title,
      quantity: item.quantity,
      price: item.price
    }));
    const createdAt = new Date(order.created_at);
    const year = createdAt.getFullYear();
    const month = String(createdAt.getMonth() + 1).padStart(2, '0'); // 月份從 0 開始
    const day = String(createdAt.getDate()).padStart(2, '0');

    const orderDateStr = `${year}-${month}-${day}`; // → "20250619"
    console.log(`訂單日期：${orderDateStr}`);

    console.log(`👤 顧客：${customerName}`);
    console.log(`💵 總金額：$${total}`);
    console.log('📦 商品明細：');
    console.table(items);

    // // 📤 上傳到 Ecount 的邏輯
    // 整理資料
    // await createSaleByShopify(inputValue);

    // 📤 匯入 notion 的邏輯
    // 整理資料並output為propertiesForNewPages(陣列)

    const propertiesForNewPages = [
      {
        "訂單編號": {
          type: "title",
          title: [{ type: "text", text: { content: "#1025" } }],
        },
        "平台": {
          type: "select",
          select: { name: "Shopify" },
        },
        "客戶名稱": {
          type: "rich_text",
          rich_text: [{ type: "text", text: { content: customerName } }],
        },
        "Email": {
          type: "email",
          email: "customer@example.com",
        },
        "聯絡電話": {
          type: "phone_number",
          phone_number: "+886-912-345-678",
        },
        "訂單金額": {
          type: "number",
          number: total,
        },
        "配送地址": {
          type: "rich_text",
          rich_text: [
            { type: "text", text: { content: "台北市中山區南京東路一段 100 號 10 樓" } },
          ],
        },
        "訂單日期": {
          type: "date",
          date: { start: orderDateStr },
        },
      },
    ];

    console.log("Adding new pages...")
    for (let i = 0; i < propertiesForNewPages.length; i++) {
      // Add a few new pages to the database that was just created
      await addNotionPageToDatabase(propertiesForNewPages[i])
    }

  } catch (err) {
    console.error('❌ 訂單處理錯誤：', err.message);
  }
}