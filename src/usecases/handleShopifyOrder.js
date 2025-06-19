export default async function handleShopifyOrder(order) {
  try {
    console.log('🛒 處理新訂單：', order.name || order.id);

    // 🔍 基本資訊
    const customerName = `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim();
    const total = order.total_price;
    const items = order.line_items.map(item => ({
      title: item.title,
      quantity: item.quantity,
      price: item.price
    }));

    console.log(`👤 顧客：${customerName}`);
    console.log(`💵 總金額：$${total}`);
    console.log('📦 商品明細：');
    console.table(items);

    // 📤 TODO: 在這裡加上傳到 Ecount 的邏輯，例如：
    // await createSalesOrderInEcount(order)

  } catch (err) {
    console.error('❌ 訂單處理錯誤：', err.message);
  }
}