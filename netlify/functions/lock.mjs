// netlify/functions/lock.js
// Password ko time-lock ke saath store karta hai
// Security = server-side time check (bypass impossible)

const { getStore } = require("@netlify/blobs");
const crypto = require("crypto");

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
    const body = JSON.parse(event.body);
    const { password, unlockTimestamp, hint } = body;

    // Validation
    if (!password || typeof password !== "string" || password.trim() === "") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Password khaali nahi hona chahiye" }),
      };
    }

    if (!unlockTimestamp || typeof unlockTimestamp !== "number") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "unlockTimestamp required hai" }),
      };
    }

    // Future mein hona chahiye
    if (unlockTimestamp <= Date.now()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Unlock time future mein hona chahiye" }),
      };
    }

    // Max 2 saal tak lock kar sakte ho
    const twoYears = Date.now() + (2 * 365 * 24 * 60 * 60 * 1000);
    if (unlockTimestamp > twoYears) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Maximum 2 saal tak lock kar sakte ho" }),
      };
    }

    // Unique ID generate karo (32 char hex)
    const id = crypto.randomBytes(16).toString("hex");

    // Netlify Blobs mein save karo
    const store = getStore("timelock-secrets");
    await store.setJSON(id, {
      password: password.trim(),       // plaintext — server hi security hai
      unlockTimestamp,
      hint: hint ? hint.trim().slice(0, 150) : "",
      createdAt: Date.now(),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        id,
        unlockDate: new Date(unlockTimestamp).toISOString(),
      }),
    };

  } catch (err) {
    console.error("Lock error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error. Dobara try karo." }),
    };
  }
};
