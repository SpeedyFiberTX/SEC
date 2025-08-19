// import createSaleByShopify from "./createSaleByShopify";
import addNotionPageToDatabase from "../services/notion/add-page-to-database.js";

/* ----------------------------- 共用工具 ----------------------------- */
function formatDateYYYYMMDD(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  const title = order?.name || (order?.number ? `#${order.number}` : String(order?.id || ""));
  const createdDate = formatDateYYYYMMDD(order?.created_at);
  const currencyCode = order?.currency || "USD";

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

  // 商品明細：每一行一個項目
  const lineItems = Array.isArray(order?.line_items) ? order.line_items : [];
  const items = lineItems.map((item) => {
    const unitPrice = Number(item?.price ?? 0);
    const qty = Number(item?.quantity ?? 0);
    const subtotal = unitPrice * qty;
    const variantText = compactJoin(
      [
        item?.sku ? `SKU: ${item.sku}` : "",
        item?.variant_title && item.variant_title !== "Default Title" ? `Variant: ${item.variant_title}` : "",
      ],
      " / "
    );

    const main = `${item?.title || "(未命名商品)"} × ${qty} @ ${currency(unitPrice, currencyCode)} = ${currency(subtotal, currencyCode)}`;
    return variantText ? `${main} 〔${variantText}〕` : main;
  });

  return {
    title,
    platform: "Shopify", // 需要與 Notion 資料庫 select 選項一致；可改用 order.source_name
    customerName,
    email,
    phone,
    total,
    shippingAddress,
    createdDate,
    currencyCode,
    items,
  };
}

/* ------------------------ 組 Notion Properties ------------------------ */
function buildNotionProperties(ex) {
  const itemLines = ex.items.length ? ex.items : ["（無商品明細）"];
  const itemText = itemLines.join("\n");

  return {
    "訂單編號": {
      type: "title",
      title: [{ type: "text", text: { content: ex.title } }],
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
    console.log("Adding new pages...");
    for (let i = 0; i < propertiesForNewPages.length; i++) {
      await addNotionPageToDatabase(propertiesForNewPages[i]);
    }

    // 5)（選用）同步 Ecount 的流程可在這裡呼叫
    // await createSaleByShopify(inputValue);

  } catch (err) {
    console.error("❌ 訂單處理錯誤：", err?.message || err);
  }
}