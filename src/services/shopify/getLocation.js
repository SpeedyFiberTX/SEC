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

const getLocationID = gql`
query {
  locations(first: 5) {
    edges {
      node {
        id
        name
        address {
          formatted
        }
      }
    }
  }
}
`;

async function runGetLocationID(){
    try{
        const response = await client.request(getLocationID)

        console.log(`查詢倉庫id成功`)
        console.log(response.locations.edges)
    }catch(error){
        console.log(`查詢倉庫失敗`)
        console.error(error.message)
    }
}

runGetLocationID()