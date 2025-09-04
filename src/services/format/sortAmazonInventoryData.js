export default function sortAmazonInventoryData(allSummaries, ecountProductList, ecountInventory) {
    // ---- Build fast lookups ----
    const invByProdCd = new Map(
        (ecountInventory || []).map(inv => [String(inv.PROD_CD), inv])
    );
    const productsByProdCd = new Map(
        (ecountProductList || []).map(p => [String(p.PROD_CD), p])
    );

    // 組合 Ecount 產品SKU+庫存數量（O(n)）
    const merged = [];
    for (const [prodCd, p] of productsByProdCd.entries()) {
        const inv = invByProdCd.get(prodCd);
        const bal = Number(inv?.BAL_QTY ?? 0) || 0;
        merged.push({
            PROD_CD: prodCd,
            SIZE_DES: p?.SIZE_DES ?? null,
            BAL_QTY: bal,
        });
    }

    // Fast lookup for merged
    const mergedByProdCd = new Map(merged.map(x => [x.PROD_CD, x]));

    // ---- Buckets (declare OUTSIDE so they are in scope) ----
    const newProducts = [];
    const existProducts = [];
    const newSalesProducts = [];     // 要建立銷貨單（扣庫存）
    const newPurchasesProducts = []; // 要建立進貨單（加庫存）
    const noChange = [];

    // ---- Decide actions without mutating originals ----
    for (const inventory of allSummaries) {
        const fnSku = String(inventory.fnSku);
        const fbaQty = Number(inventory?.inventoryDetails?.fulfillableQuantity ?? 0) || 0;
        const ecount = mergedByProdCd.get(fnSku);

        if (!ecount) {
            // Not in Ecount → 需要建立品項，並視為「加庫存」(初始入庫)
            newProducts.push(inventory);
            newPurchasesProducts.push({
                ...inventory,
                deltaQty: fbaQty, // 明確標註要加的數量
            });
            continue;
        }

        existProducts.push(inventory);

        const diff = fbaQty - ecount.BAL_QTY; // 正數=要加；負數=要減；0=不動
        if (diff === 0) {
            noChange.push(inventory);
        } else if (diff > 0) {
            newPurchasesProducts.push({
                ...inventory,
                deltaQty: diff,
            });
        } else {
            newSalesProducts.push({
                ...inventory,
                deltaQty: Math.abs(diff),
            });
        }
    }

    return {newProducts,existProducts,newSalesProducts,newPurchasesProducts,noChange}
}