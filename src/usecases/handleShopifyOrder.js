import addNotionPageToDatabase from "../services/notion/add-page-to-database.js";
import addNotionPageToOrderDatabase from "../services/notion/add-page-to-order-database.js";
import formatDateYYYYMMDD from "../services/format/formatDateYYYYMMDD.js";
import pushMessageToMe from "../services/line/pushMessage.js";
import login from "../services/ecount/login.js";
import saleOrder from "../services/ecount/SaleOrder.js";
import getItems from '../services/ecount/getItems.js';

/* ----------------------------- 共用工具 ----------------------------- */

function compactJoin(parts, sep = ", ") {
  return parts
    .filter(Boolean)
    .map((s) => String(s).trim())
    .filter(Boolean)
    .join(sep);
}

function currency(num, ccy = "USD") {
  const n = Number(num ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: ccy }).format(n);
}

/* ------------------------ Shopify 欄位集中處理 ------------------------ */
function extractOrderFields(order) {
  const id = order?.id || "";
  const number = order?.number || null; // Shopify 訂單 ID
  const title = order?.name || (number ? `#${number}` : String(id));
  const [createdDate, createdDate8] = formatDateYYYYMMDD(order?.created_at);
  const currencyCode = order?.currency || "USD";

  // 嘗試從 fulfillments 取倉庫（已指派/已出貨才會有）
  const fulfillments = Array.isArray(order?.fulfillments) ? order.fulfillments : [];
  const locIds = [...new Set(fulfillments.map(f => f?.location_id).filter(Boolean))];
  const warehouseIds = locIds;                              // 可能有多倉
  const singleWarehouseId = warehouseIds.length === 1 ? warehouseIds[0] : null;

  const customerName =
    compactJoin([order?.customer?.first_name, order?.customer?.last_name], " ") ||
    order?.shipping_address?.name ||
    "Guest";

  const email = order?.email || order?.customer?.email || "";
  const phone =
    order?.shipping_address?.phone ||
    order?.billing_address?.phone ||
    order?.customer?.phone ||
    "";

  const shipping = order?.shipping_address || {};
  const shippingAddress = compactJoin([
    shipping.name,
    compactJoin([shipping.company, shipping.address1, shipping.address2], " "),
    compactJoin([shipping.city, shipping.province], ", "),
    shipping.zip,
    shipping.country,
  ]);

  const total = Number(order?.total_price ?? 0);

  // 商品明細改成物件陣列
  const lineItems = Array.isArray(order?.line_items) ? order.line_items : [];
  const items = lineItems.map((item) => {
    return {
      title: item?.title || "(未命名商品)",
      sku: item?.sku || "",
      variant: item?.variant_title && item.variant_title !== "Default Title" ? item.variant_title : "",
      quantity: Number(item?.quantity ?? 0),
      price: Number(item?.price ?? 0),   // 單價
      subtotal: Number(item?.price ?? 0) * Number(item?.quantity ?? 0),
      currency: currencyCode,
    };
  });

  return {
    id,
    number,
    title,
    platform: "Shopify", // 需要與 Notion 資料庫 select 選項一致；可改用 order.source_name
    customerName,
    email,
    phone,
    total,
    shippingAddress,
    createdDate,
    createdDate8,
    currencyCode,
    items,
    // 倉庫資訊（只依 fulfillments，可為多倉）
    warehouseIds,        // 例如 [123456789, 987654321]
    singleWarehouseId,   // 單倉就給數字，否則為 null
  };

}

/* ------------------------ 組 Notion Properties  (平台訂單彙整)------------------------ */
function buildNotionProperties(ex) {
  const itemLines = Array.isArray(ex.items) && ex.items.length
    ? ex.items.map(i => {
      const qty = Number(i?.quantity ?? 0);
      const price = Number(i?.price ?? 0);
      const subtotal = qty * price;

      // 行內片段：標題(可選)、SKU(可選)、數量、單價、金額
      const chunks = [
        i?.title ? `${i.title}` : null,
        i?.sku ? `〔SKU: ${i.sku}〕` : null,
        `× ${qty}`,
        `@ ${currency(price, ex.currencyCode)}`,
        `= ${currency(subtotal, ex.currencyCode)}`
      ].filter(Boolean);

      return `• ${chunks.join(" ")}`;
    })
    : ["（無商品明細）"];

  const itemText = itemLines.join("\n");

  return {
    "訂單編號": {
      type: "title",
      title: [{ type: "text", text: { content: ex.title } }],
    },
    "出貨倉庫": {
      type: "select",
      select: { name: ex.singleWarehouseId === 81795907814 ? "台灣" : "深圳", }, // 必須與資料庫選項同名
    },
    "平台": {
      type: "select",
      select: { name: ex.platform }, // 必須與資料庫選項同名
    },
    "客戶名稱": {
      type: "rich_text",
      rich_text: [{ type: "text", text: { content: ex.customerName } }],
    },
    "Email": {
      type: "email",
      email: ex.email, // 空字串可接受
    },
    "聯絡電話": {
      type: "phone_number",
      phone_number: ex.phone,
    },
    "訂單金額": {
      type: "number",
      number: ex.total,
    },
    "配送地址": {
      type: "rich_text",
      rich_text: [{ type: "text", text: { content: ex.shippingAddress || "" } }],
    },
    "訂單日期": {
      type: "date",
      date: ex.createdDate ? { start: ex.createdDate } : null,
    },
    // 新增：商品明細（rich_text 多行）
    "商品明細": {
      type: "rich_text",
      rich_text: [{ type: "text", text: { content: itemText } }],
    },
  };
}

/* ------------------------ 組 Notion Properties (訂單) ------------------------ */
function buildNotionOrderProperties(ex) {
  const itemLines = Array.isArray(ex.items) && ex.items.length
    ? ex.items.map(i => {
      const qty = Number(i?.quantity ?? 0);
      const price = Number(i?.price ?? 0);
      const subtotal = qty * price;

      // 行內片段：標題(可選)、SKU(可選)、數量、單價、金額
      const chunks = [
        i?.title ? `${i.title}` : null,
        i?.sku ? `〔SKU: ${i.sku}〕` : null,
        `× ${qty}`,
        `@ ${currency(price, ex.currencyCode)}`,
        `= ${currency(subtotal, ex.currencyCode)}`
      ].filter(Boolean);

      return `• ${chunks.join(" ")}`;
    })
    : ["（無商品明細）"];

  const itemText = itemLines.join("\n");
  const skuList = ex.items.map(item => item.sku);
  const skuText = skuList.join("\n");

  return {
    "Name": {
      type: "title",
      title: [{ type: "text", text: { content: ex.customerName } }],
    },
    "平台": {
      type: "select",
      select: { name: "官網" }, // 必須與資料庫選項同名
    },
    "價格(稅內)": {
      type: "number",
      number: ex.total,
    },
    "Order Date": {
      type: "date",
      date: ex.createdDate ? { start: ex.createdDate } : null,
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
  };
}

/* ------------------------ 組 Ecount Properties ------------------------ */
async function buildEcountProperties(SESSION_ID, ex) {



  try {

    // 取得Ecount全產品資料
    const EcountProductList = await getItems(SESSION_ID);

    // 要return的資料
    const SaleOrderList = {
      "SaleOrderList": []
    }


    ex.items.forEach(item => {

      // 以SKU查詢品項編碼
      const productDetail = EcountProductList.find(product => product.SIZE_DES === item.sku);
      console.log(productDetail);

      // 假如品項存在
      if (productDetail) {
        SaleOrderList["SaleOrderList"].push({
          "BulkDatas": {
            "IO_DATE": ex.createdDate8,
            "UPLOAD_SER_NO": String(ex.number ?? ex.id),
            "CUST": "10015",
            "CUST_DES": "Shopify",
            "EMP_CD": "10019",
            "WH_CD": ex.singleWarehouseId === 81795907814 ? "100" : "200",
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
            "U_MEMO1": ex.title,
            "U_MEMO2": ex.customerName,
            "U_MEMO3": "",
            "U_MEMO4": "",
            "U_MEMO5": "",
            "ADD_TXT_01_T": ex.shippingAddress,
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
            "QTY": item.quantity,
            "PRICE": ex.singleWarehouseId === 81795907814 ? "" : item.price, //單價(美國訂單)
            "USER_PRICE_VAT": ex.singleWarehouseId === 81795907814 ? item.price : "", //單價含稅(台灣訂單)
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
        SaleOrderList["SaleOrderList"].push({
          "BulkDatas": {
            "IO_DATE": ex.createdDate8,
            "UPLOAD_SER_NO": String(ex.number ?? ex.id),
            "CUST": "10015",
            "CUST_DES": "Shopify",
            "EMP_CD": "10007",
            "WH_CD": ex.singleWarehouseId === 81795907814 ? "100" : "200",
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
            "U_MEMO1": ex.title,
            "U_MEMO2": ex.customerName,
            "U_MEMO3": "",
            "U_MEMO4": "",
            "U_MEMO5": "",
            "ADD_TXT_01_T": ex.shippingAddress,
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
            "QTY": item.quantity,
            "PRICE": ex.singleWarehouseId === 81795907814 ? "" : item.price, //單價(美國訂單)
            "USER_PRICE_VAT": ex.singleWarehouseId === 81795907814 ? item.price : "", //單價含稅(台灣訂單)
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

    return SaleOrderList;

  } catch (err) {
    console.error("❌ Ecount 資料處理錯誤：", err?.message || err);
  }


}

/* ------------------------------- 主流程 ------------------------------- */
export default async function handleShopifyOrder(order) {
  try {
    // 1) 萃取資料
    const ex = extractOrderFields(order);

    // 先把商品明細組成文字（這裡示範 SKU × 數量）
    const itemText = ex.items.map(i =>
      `• SKU: ${i.sku || "N/A"} × ${i.quantity}`
    ).join('\n');

    // 2) 日誌
    console.log("🛒 處理新訂單：", ex.title);
    console.log(`👤 顧客：${ex.customerName}`);
    console.log(`💵 總金額：${currency(ex.total, ex.currencyCode)}`);
    console.log(`🗓️ 日期：${ex.createdDate}`);
    console.log("📦 商品明細：\n" + itemText);

    // 補充： line 通知

    // 用陣列逐行組訊息，避免任何前導空白
    const messageLines = [
      `Shopify 有新訂單：`,
      `🧾 訂單編號：${ex.title}`,
      `🧑‍💼 顧客：${ex.customerName}`,
      `💵 總金額：${currency(ex.total, ex.currencyCode)}`,
      `📅 日期：${ex.createdDate}`,
      `📦 商品明細：`,
      itemText,
    ];

    const message = messageLines.join('\n');

    await pushMessageToMe(message)

    // 3) 組 Notion Properties
    const propertiesForNewPages = [buildNotionProperties(ex)];
    const propertiesForOrderNewPages = [buildNotionOrderProperties(ex)];

    // 4) 寫入 Notion
    console.log("📝 開始新增資料到平台訂單彙整...");
    for (let i = 0; i < propertiesForNewPages.length; i++) {
      const res = await addNotionPageToDatabase(propertiesForNewPages[i]);
      if (res) {
        console.log('✅ 已建立 notion 資料')
      }
    }

    console.log("📝 開始新增資料到訂單...");
    for (let i = 0; i < propertiesForOrderNewPages.length; i++) {
      const res = await addNotionPageToOrderDatabase(propertiesForOrderNewPages[i]);
      if (res) {
        console.log('✅ 已建立 notion 資料')
      }
    }

    // 5) 組 Ecount Properties
    const SESSION_ID = await login();
    if (!SESSION_ID) throw new Error('SESSION_ID 為空');

    const inputValue = await buildEcountProperties(SESSION_ID, ex);
    // 6)（選用）同步 Ecount 的流程可在這裡呼叫
    await saleOrder(SESSION_ID, inputValue);

  } catch (err) {
    console.error("❌ Shopify 訂單處理錯誤：", err?.message || err);
  }
}