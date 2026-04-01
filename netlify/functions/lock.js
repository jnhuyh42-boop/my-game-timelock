// netlify/functions/lock.js
// Stores encrypted password with unlock time in Netlify Blobs (persistent storage)

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
    const { encryptedPassword, unlockTimestamp, hint } = JSON.parse(event.body);

    if (!encryptedPassword || !unlockTimestamp) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "encryptedPassword aur unlockTimestamp required hai" }),
      };
    }

    // Unique ID generate karo
    const id = crypto.randomBytes(16).toString("hex");

    // Netlify Blobs mein store karo (persistent!)
    const store = getStore("timelock-secrets");
    await store.setJSON(id, {
      encryptedPassword,
      unlockTimestamp,
      hint: hint || "",
      createdAt: Date.now(),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        id,
        message: "Password lock ho gaya!",
        unlockDate: new Date(unlockTimestamp).toLocaleDateString("hi-IN"),
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
