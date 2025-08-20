import createEcountSale from "../usecases/createEcountSale.js";
import addNotionPageToDatabase from "../services/notion/add-page-to-database.js";
import getEcountItems from "./getEcountItems.js";

/* ----------------------------- 共用工具 ----------------------------- */
function formatDateYYYYMMDD(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return [`${y}-${m}-${day}`, `${y}${m}${day}`];
}

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

/* ------------------------ 組 Notion Properties ------------------------ */
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

/* ------------------------ 組 Ecount Properties ------------------------ */
async function buildEcountProperties(ex) {



  try {

    // 取得Ecount全產品資料
    const EcountProductList = await getEcountItems();

    // 要return的資料
    const saleList = {}


    ex.items.forEach(item => {

      // 以SKU查詢品項編碼
      const productDetail = EcountProductList.find(product => product.SIZE_DES === item.sku);
      console.log(productDetail);

      saleList["SaleList"].push({
        "BulkDatas": {
          "IO_DATE": ex.createdDate8,
          "UPLOAD_SER_NO": String(ex.number ?? ex.id),
          "CUST": "10015",
          "CUST_DES": "Shopify",
          "EMP_CD": "10007",
          "WH_CD": ex.singleWarehouseId === 81795907814 ? "100" : "200", //如果是深圳倉庫 200 台灣倉庫 100
          "IO_TYPE": "",
          "EXCHANGE_TYPE": "",
          "EXCHANGE_RATE": "",
          "SITE": "",
          "PJT_CD": "",
          "DOC_NO": "",
          "TTL_CTT": "",
          "U_MEMO1": ex.createdDate8,
          "U_MEMO2": ex.title,
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
          "PROD_CD": productDetail.PROD_CD, //要先以SKU查詢品項編碼，多產品要發兩次，序號一致就會綁定在一起(推測)
          "PROD_DES": "",
          "SIZE_DES": "",
          "UQTY": "",
          "QTY": "1",
          "PRICE": ex.singleWarehouseId === 81795907814 ? "" : item.price, //單價(美國訂單)
          "USER_PRICE_VAT": ex.singleWarehouseId === 81795907814 ? item.price : "", //單價含稅(台灣訂單)
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
          "REL_DATE": ex.createdDate8,
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
      })
    });

    return saleList;

  } catch (err) {
    console.error("❌ Ecount 資料處理錯誤：", err?.message || err);
  }


}

/* ------------------------------- 主流程 ------------------------------- */
export default async function handleShopifyOrder(order) {
  try {
    // 1) 萃取資料
    const ex = extractOrderFields(order);

    // 2) 日誌
    console.log("🛒 處理新訂單：", ex.title);
    console.log(`👤 顧客：${ex.customerName}`);
    console.log(`💵 總金額：${currency(ex.total, ex.currencyCode)}`);
    console.log(`🗓️ 日期：${ex.createdDate}`);
    console.log("📦 商品明細：\n" + ex.items.map((s) => `• ${s}`).join("\n"));

    // 3) 組 Notion Properties
    const propertiesForNewPages = [buildNotionProperties(ex)];

    // 4) 寫入 Notion
    console.log("📝 開始新增 notion 資料...");
    for (let i = 0; i < propertiesForNewPages.length; i++) {
      const res = await addNotionPageToDatabase(propertiesForNewPages[i]);
      if (res) {
        console.log('✅ 已建立 notion 資料')
      }
    }

    // 5) 組 Ecount Properties
    const inputValue = await buildEcountProperties(ex);
    // 6)（選用）同步 Ecount 的流程可在這裡呼叫
    await createEcountSale(inputValue);

  } catch (err) {
    console.error("❌ 訂單處理錯誤：", err?.message || err);
  }
}