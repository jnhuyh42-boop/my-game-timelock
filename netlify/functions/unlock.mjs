import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method === "OPTIONS") return new Response("OK", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) return new Response(JSON.stringify({ error: "ID required hai" }), { status: 400 });

    const store = getStore("timelock-secrets");
    const data = await store.get(id, { type: "json" });

    if (!data) return new Response(JSON.stringify({ error: "Koi secret nahi mila. ID check karo." }), { status: 404 });

    const now = Date.now();
    const unlockTime = data.unlockTimestamp;

    // Time Check Logic
    if (now < unlockTime) {
      const remaining = unlockTime - now;
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

      return new Response(JSON.stringify({
        error: "Abhi time nahi hua",
        locked: true,
        remaining: { days, hours, minutes },
        hint: data.hint || null
      }), { 
        status: 403, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // Time Up - Unlock Password
    return new Response(JSON.stringify({
      success: true,
      encryptedPassword: data.encryptedPassword,
      hint: data.hint
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error: " + err.message }), { status: 500 });
  }
};
