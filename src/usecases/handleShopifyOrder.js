import createSaleByShopify from "./createSaleByShopify";

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
    const createdAt = new Date(order.created_at);
    const year = createdAt.getFullYear();
    const month = String(createdAt.getMonth() + 1).padStart(2, '0'); // 月份從 0 開始
    const day = String(createdAt.getDate()).padStart(2, '0');

    const orderDateStr = `${year}${month}${day}`; // → "20250619"
    console.log(`訂單日期：${orderDateStr}`);

    console.log(`👤 顧客：${customerName}`);
    console.log(`💵 總金額：$${total}`);
    console.log('📦 商品明細：');
    console.table(items);

    // 這邊還沒有確定到底該怎麼填
    const inputValue = {
      "SaleList": [{
        "BulkDatas": {
          "IO_DATE": orderDateStr,
          "UPLOAD_SER_NO": order.name || order.id,
          "CUST": "",
          "CUST_DES": "",
          "EMP_CD": "",
          "WH_CD": "00009",
          "IO_TYPE": "",
          "EXCHANGE_TYPE": "",
          "EXCHANGE_RATE": "",
          "SITE": "",
          "PJT_CD": "",
          "DOC_NO": "",
          "TTL_CTT": "",
          "U_MEMO1": orderDateStr,
          "U_MEMO2": "",
          "U_MEMO3": "",
          "U_MEMO4": "",
          "U_MEMO5": "",
          "ADD_TXT_01_T": "",
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
          "PROD_CD": "M1DXRBLCULCU2OZH10M",
          "PROD_DES": "test",
          "SIZE_DES": "",
          "UQTY": "",
          "QTY": "1",
          "PRICE": "",
          "USER_PRICE_VAT": "",
          "SUPPLY_AMT": "",
          "SUPPLY_AMT_F": "",
          "VAT_AMT": "",
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
          "REL_DATE": orderDateStr,
          "REL_NO": "",
          "MAKE_FLAG": "",
          "CUST_AMT": "",
          "P_AMT1": "",
          "P_AMT2": "",
          "ADD_NUM_01": "",
          "ADD_NUM_02": "",
          "ADD_NUM_03": "",
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
      }]
    }

    // 📤 TODO: 在這裡加上傳到 Ecount 的邏輯，例如：
    await createSaleByShopify(inputValue);

  } catch (err) {
    console.error('❌ 訂單處理錯誤：', err.message);
  }
}