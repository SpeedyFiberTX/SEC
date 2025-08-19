import { Client } from "@notionhq/client"
import { config } from "dotenv"

config()

const apiKey = process.env.NOTION_API_KEY
const databaseId = process.env.NOTION_DATA_ID

const notion = new Client({ auth: apiKey })

export default async function addNotionPageToDatabase(pageProperties) {
  const newPage = await notion.pages.create({
    parent: {
      database_id: databaseId,
    },
    properties: pageProperties,
  })
  return newPage
}