// netlify/functions/unlock.js
const { getStore, connectLambda } = require("@netlify/blobs");

exports.handler = async (event) => {
  connectLambda(event); // Ye ek line yahan bhi add ki hai

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { id } = JSON.parse(event.body);

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "ID required hai" }),
      };
    }

    const store = getStore("timelock-secrets");
    const data = await store.get(id, { type: "json" });

    if (!data) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Koi secret nahi mila is ID se. ID check karo." }),
      };
    }

    const now = Date.now();
    const unlockTime = data.unlockTimestamp;

    if (now < unlockTime) {
      const remaining = unlockTime - now;
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: "Abhi time nahi hua",
          locked: true,
          remaining: { days, hours, minutes },
          unlockDate: new Date(unlockTime).toISOString(),
          hint: data.hint || null,
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        encryptedPassword: data.encryptedPassword,
        hint: data.hint,
        unlockedAt: new Date().toISOString(),
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error: " + err.message }),
    };
  }
};
