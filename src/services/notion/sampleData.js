export const propertiesForNewPages = [
  {
    "訂單編號": {
      type: "title",
      title: [{ type: "text", text: { content: "#1025" } }],
    },
    "平台": {
      type: "select",
      select: { name: "Shopify" },
    },
    "客戶名稱": {
      type: "rich_text",
      rich_text: [{ type: "text", text: { content: "王小明" } }],
    },
    "Email": {
      type: "email",
      email: "customer@example.com",
    },
    "聯絡電話": {
      type: "phone_number",
      phone_number: "+886-912-345-678",
    },
    "訂單金額": {
      type: "number",
      number: 75.18,
    },
    "配送地址": {
      type: "rich_text",
      rich_text: [
        { type: "text", text: { content: "台北市中山區南京東路一段 100 號 10 樓" } },
      ],
    },
    "訂單日期": {
      type: "date",
      date: { start: "2023-05-11" },
    },
  },
];
