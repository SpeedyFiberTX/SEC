import dotenv from 'dotenv'; //處理.env 環境變數
import { GraphQLClient, gql } from 'graphql-request'; //處理GraphQL

dotenv.config();

const SHOP = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const LOCATION_Id = process.env.SHOPIFY_LOCATION_TW_ID;

const graphqlEndpoint = `https://${SHOP}/admin/api/2024-01/graphql.json`;
const client = new GraphQLClient(graphqlEndpoint, {
  headers: {
    'X-Shopify-Access-Token': TOKEN,
    'Content-Type': 'application/json',
  }
});

const getVariantsID = gql`
query ProductVariantsList($query: String!)  {
  productVariants(first: 1, query: $query) {
    nodes {
      id
      title
      sku
      inventoryQuantity
      product {
          id
          title
        }
      inventoryItem {
        id
      }
    }
    pageInfo {
      startCursor
      endCursor
    }
  }
}
`;

export default async function runGetVariantsID(sku) {
  try {
    const variables = { query: `sku:${sku}` };
    const response = await client.request(getVariantsID, variables)


    const Variants = response.productVariants.nodes;
    if (Variants.length > 0) {
      const variantsInput = Variants.map(item => ({ inventoryItemId: item.inventoryItem.id, locationId: LOCATION_Id }));
      // console.log(`Shopify 查詢 Variant成功 SKU：${sku}`)
      // console.log(variantsInput[0]);
      return variantsInput[0];
    } else {
      console.log(`Shopify 無此 Variant SKU：${sku}`)
      return null;
    }
  } catch (error) {
    console.log(`Shopify 查詢 Variant 失敗`)
    console.error(error.message)
  }
}