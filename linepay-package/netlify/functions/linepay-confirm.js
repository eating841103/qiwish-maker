// netlify/functions/linepay-confirm.js
//
// 客人在 LINE Pay 頁面完成付款後，LINE Pay 會把客人導回這支函式的網址，
// 並附上 transactionId。這支函式要再打一次「確認付款 Confirm API」，
// 付款才算真正完成（這一步不能省略，否則錢不會真的請款成功）。
//
// 需要跟 linepay-request.js 一樣的環境變數：
//   LINE_PAY_CHANNEL_ID, LINE_PAY_CHANNEL_SECRET, LINE_PAY_ENV, SITE_URL

const crypto = require("crypto");

exports.handler = async function (event) {
  try {
    const params = event.queryStringParameters || {};
    const transactionId = params.transactionId;
    const orderId = params.orderId;

    const channelId = process.env.LINE_PAY_CHANNEL_ID;
    const channelSecret = process.env.LINE_PAY_CHANNEL_SECRET;
    const env = process.env.LINE_PAY_ENV === "production" ? "production" : "sandbox";
    const siteUrl = process.env.SITE_URL;

    if (!transactionId) {
      return redirect(`${siteUrl}/?linepay=missing_transaction`);
    }

    const baseUrl =
      env === "production" ? "https://api-pay.line.me" : "https://sandbox-api-pay.line.me";
    const uri = `/v3/payments/${transactionId}/confirm`;

    // 金額必須跟當初 request 時一致，這裡示範用固定金額或你可以改成從資料庫查回訂單金額
    // ⚠️ 實務上建議：下單時把 orderId + amount 存進資料庫（例如 Netlify Blobs 或其他資料庫），
    // 這裡再依 orderId 查出正確金額，避免有人竄改金額參數。
    const amount = params.amount ? Number(params.amount) : null;

    if (!amount) {
      return redirect(`${siteUrl}/?linepay=missing_amount`);
    }

    const requestBody = { amount: amount, currency: "TWD" };
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

    if (result.returnCode === "0000") {
      // 付款成功，這裡你可以改成寄通知信、寫入訂單資料庫等
      return redirect(`${siteUrl}/?linepay=success&orderId=${encodeURIComponent(orderId || "")}`);
    } else {
      return redirect(`${siteUrl}/?linepay=failed`);
    }
  } catch (err) {
    const siteUrl = process.env.SITE_URL || "";
    return redirect(`${siteUrl}/?linepay=error`);
  }
};

function redirect(location) {
  return {
    statusCode: 302,
    headers: { Location: location },
    body: "",
  };
}
