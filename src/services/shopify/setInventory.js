import dotenv from 'dotenv'; //處理.env 環境變數
import { GraphQLClient, gql } from 'graphql-request'; //處理GraphQL

dotenv.config();

const SHOP = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

const graphqlEndpoint = `https://${SHOP}/admin/api/2024-01/graphql.json`;
const client = new GraphQLClient(graphqlEndpoint, {
  headers: {
    'X-Shopify-Access-Token': TOKEN,
    'Content-Type': 'application/json',
  }
});


const setInventory = gql`
mutation inventorySetOnHandQuantities($input: InventorySetOnHandQuantitiesInput!) {
  inventorySetOnHandQuantities(input: $input) {
    userErrors {
      field
      message
    }
    inventoryAdjustmentGroup {
      changes {
        name
        delta
        quantityAfterChange
      }
    }
  }
}
`;

export default async function runSetInventory(variantsInput) {

  const chunkSize = 100;
  const allResults = [];

  for (let i = 0; i < variantsInput.length; i += chunkSize) {
    const chunk = variantsInput.slice(i, i + chunkSize);
    const variables = {
      input: {
        reason: 'correction',
        setQuantities: chunk
      }
    };

    try {

      console.log(`🟢 上傳 ${chunk.length} 筆（${i + 1} ~ ${i + chunk.length}）`);
      const response = await client.request(setInventory, variables)
      const { userErrors, inventoryAdjustmentGroup } = response.inventorySetOnHandQuantities;

      if (userErrors?.length) {
        console.warn('⚠️ userErrors detected:');
        console.table(userErrors);
        allResults.push({ success: false, userErrors });
      } else if (inventoryAdjustmentGroup && inventoryAdjustmentGroup.changes) {
        console.log('✅ 批次更新成功');
        console.table(inventoryAdjustmentGroup.changes);
        allResults.push({ success: true, changes: inventoryAdjustmentGroup.changes });
      } else {
        console.log('ℹ️ 批次完成，但沒有任何變更');
        allResults.push({ success: true, changes: [] });
      }
    } catch (error) {
      console.error('❌ 更新失敗：', error.response?.errors || error.message);
      allResults.push({ success: false, error: error.message });
    }
  }
  return allResults;
}