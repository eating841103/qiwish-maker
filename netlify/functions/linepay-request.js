// netlify/functions/linepay-request.js
//
// 這支程式在「伺服器端」執行（客人的瀏覽器看不到內容，也看不到金鑰）。
// 前端網頁會呼叫這支函式，這支函式再用你的 Channel Secret 去跟 LINE Pay 要一組付款網址，
// 回傳給前端後，前端再把客人導過去。
//
// 需要在 Netlify 後台設定的環境變數（Site settings → Environment variables）：
//   LINE_PAY_CHANNEL_ID      你的 LINE Pay Channel ID
//   LINE_PAY_CHANNEL_SECRET  你的 LINE Pay Channel Secret Key（絕對不要寫死在程式碼裡）
//   LINE_PAY_ENV             sandbox（測試）或 production（正式），先用 sandbox 測試
//   SITE_URL                 你網站的正式網址，例如 https://your-site.netlify.app

const crypto = require("crypto");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body);
    const { orderId, amount, items, customerName } = data;

    if (!orderId || !amount || !items || !Array.isArray(items)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "缺少必要欄位 orderId / amount / items" }),
      };
    }

    const channelId = process.env.LINE_PAY_CHANNEL_ID;
    const channelSecret = process.env.LINE_PAY_CHANNEL_SECRET;
    const env = process.env.LINE_PAY_ENV === "production" ? "production" : "sandbox";
    const siteUrl = process.env.SITE_URL;

    if (!channelId || !channelSecret || !siteUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "尚未設定 LINE_PAY_CHANNEL_ID / LINE_PAY_CHANNEL_SECRET / SITE_URL 環境變數",
        }),
      };
    }

    const baseUrl =
      env === "production" ? "https://api-pay.line.me" : "https://sandbox-api-pay.line.me";
    const uri = "/v3/payments/request";

    // LINE Pay 商品清單有格式限制，這裡把購物車內容整理成它要的格式
    const packages = [
      {
        id: orderId,
        amount: amount,
        products: items.map((it) => ({
          name: it.name,
          quantity: 1,
          price: it.price,
        })),
      },
    ];

    const requestBody = {
      amount: amount,
      currency: "TWD",
      orderId: orderId,
      packages: packages,
      redirectUrls: {
        confirmUrl: `${siteUrl}/.netlify/functions/linepay-confirm?orderId=${encodeURIComponent(orderId)}&amount=${amount}`,
        cancelUrl: `${siteUrl}/?linepay=cancel`,
      },
    };

    const bodyString = JSON.stringify(requestBody);
    const nonce = crypto.randomUUID();
    const stringToSign = channelSecret + uri + bodyString + nonce;
    const signature = crypto
      .createHmac("sha256", channelSecret)
      .update(stringToSign)
      .digest("base64");

    const response = await fetch(baseUrl + uri, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-LINE-ChannelId": channelId,
        "X-LINE-Authorization-Nonce": nonce,
        "X-LINE-Authorization": signature,
      },
      body: bodyString,
    });

    const result = await response.json();

    if (result.returnCode !== "0000") {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "LINE Pay 回傳錯誤", detail: result }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        paymentUrl: result.info.paymentUrl.web,
        transactionId: result.info.transactionId,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "伺服器發生錯誤", detail: String(err) }),
    };
  }
};
