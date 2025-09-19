

export default async function buildSaleOrders_ebay(order, createdDate, shippingAddressText, ecountProductListWithInv) {

    try {

        // 要return的資料
        const SaleOrderList = [];
        let WH_CD = "200";
        const perItemCanTW = [];      // 每個品項是否可由 TW 滿足
        const perItemCanFBA = [];     // 每個品項是否可由 FBA 滿足

        const items = order?.lineItems ?? [];

        items.forEach(item => {

            const sku = String(item?.sku ?? "");

            // 以SKU查詢品項編碼
            const productDetail = (ecountProductListWithInv ?? []).find(p => p?.SIZE_DES === sku);
            // console.log(productDetail);

            // 單價
            const unitPrice = item.quantity
                ? Number(item.total?.value ?? 0) / Number(item.quantity)
                : 0;

            const tw = Number(productDetail?.TW_BAL_QTY ?? 0);
            const fba = Number(productDetail?.FBA_BAL_QTY ?? 0);
            const qty = Number(item?.quantity ?? 0);


            // ③ 記錄此品項是否能由 TW / FBA 單獨滿足
            perItemCanTW.push(qty > 0 ? (tw >= qty) : true);
            perItemCanFBA.push(qty > 0 ? (fba >= qty) : true);

            // 假如品項存在
            if (productDetail) {
                SaleOrderList.push({
                    "BulkDatas": {
                        "IO_DATE": createdDate[1],
                        "UPLOAD_SER_NO": order.orderId,
                        "CUST": "PF003",
                        "CUST_DES": "ebay",
                        "EMP_CD": "10019",
                        "WH_CD": "",
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
                        "U_MEMO1": order.orderId,
                        "U_MEMO2": order.buyer?.buyerRegistrationAddress?.fullName ?? "未知",
                        "U_MEMO3": "",
                        "U_MEMO4": "",
                        "U_MEMO5": "",
                        "ADD_TXT_01_T": shippingAddressText,
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
                        "QTY": qty,
                        "PRICE": unitPrice, //單價
                        "USER_PRICE_VAT": "",
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
                SaleOrderList.push({
                    "BulkDatas": {
                        "IO_DATE": createdDate[1],
                        "UPLOAD_SER_NO": order.orderId,
                        "CUST": "PF003",
                        "CUST_DES": "ebay",
                        "EMP_CD": "10019",
                        "WH_CD": "", // 這裡要先查倉庫庫存
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
                        "U_MEMO1": order.orderId,
                        "U_MEMO2": order.buyer?.buyerRegistrationAddress?.fullName ?? "未知",
                        "U_MEMO3": "",
                        "U_MEMO4": "",
                        "U_MEMO5": "",
                        "ADD_TXT_01_T": shippingAddressText,
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
                        "QTY": qty,
                        "PRICE": unitPrice, //單價
                        "USER_PRICE_VAT": "",
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

        // === 統一決定整張單的 WH_CD（依所有品項是否可滿足） ===
        if (perItemCanTW.length > 0 && perItemCanFBA.length > 0) {
            const allTW = perItemCanTW.every(Boolean);
            const allFBA = perItemCanFBA.every(Boolean);
            if (allTW) {
                WH_CD = "100";
            } else if (allFBA) {
                WH_CD = "300";
            } // 否則維持 "200"
        }

        // 把 WH_CD 回填到每一列
        for (const row of SaleOrderList) {
            if (row?.BulkDatas) row.BulkDatas.WH_CD = WH_CD;
        }

        return { SaleOrderList, WH_CD };

    } catch (err) {
        console.error("❌ Ecount 資料處理錯誤：", err?.message || err);
        return { saleOrderData: [], WH_CD: "200" };
    }


}