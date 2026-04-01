// netlify/functions/unlock.js
// SERVER-SIDE time check — client se bypass impossible

const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
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

    if (!id || typeof id !== "string" || id.trim() === "") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "ID required hai" }),
      };
    }

    const store = getStore("timelock-secrets");
    const data = await store.get(id.trim(), { type: "json" });

    if (!data) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Koi secret nahi mila is ID se. ID sahi hai?" }),
      };
    }

    const now = Date.now();
    const unlockTime = data.unlockTimestamp;

    // ── SERVER-SIDE TIME CHECK ──────────────────────────────
    if (now < unlockTime) {
      const remaining = unlockTime - now;
      const days    = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours   = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          locked: true,
          remaining: { days, hours, minutes, seconds },
          unlockTimestamp: unlockTime,
          hint: data.hint || null,
        }),
      };
    }

    // ── TIME HO GAYA — return karo ─────────────────────────
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        password: data.password,
        hint: data.hint || null,
        unlockedAt: new Date().toISOString(),
      }),
    };

  } catch (err) {
    console.error("Unlock error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error. Dobara try karo." }),
    };
  }
};
