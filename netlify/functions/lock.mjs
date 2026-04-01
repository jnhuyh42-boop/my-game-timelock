import { getStore } from "@netlify/blobs";

export default async (req) => {
  // CORS Bypass
  if (req.method === "OPTIONS") return new Response("OK", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });

  try {
    const body = await req.json();
    const { encryptedPassword, unlockTimestamp, hint } = body;

    if (!encryptedPassword || !unlockTimestamp) {
      return new Response(JSON.stringify({ error: "Missing data" }), { status: 400 });
    }

    // Unique Random ID generate karna
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 10);

    // Database mein secure karna
    const store = getStore("timelock-secrets");
    await store.setJSON(id, {
      encryptedPassword,
      unlockTimestamp,
      hint: hint || "",
      createdAt: Date.now(),
    });

    return new Response(JSON.stringify({ success: true, id }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error: " + err.message }), { status: 500 });
  }
};
