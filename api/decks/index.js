// pages/api/decks/index.js
const { MongoClient } = require("mongodb");

let client, db;
async function getDB() {
  if (!client) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("Missing MONGODB_URI env var");
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 6000 });
    await client.connect();
    db = client.db(process.env.MONGODB_DB || "flashcards");
  }
  return db;
}

module.exports = async function handler(req, res) {
  try {
    const db = await getDB();
    const coll = db.collection(
      process.env.MONGODB_COLLECTION_DECKS || "flashcards_decks"
    );

    const method = req.method;
    const appId =
      (method === "GET" ? req.query.appId : req.body?.appId) ||
      "default-app-id";

    // GET /api/decks?appId=...
    // => lista todos os decks desse appId
    if (method === "GET") {
      const docs = await coll
        .find({ appId })
        .sort({ createdAt: 1 })
        .toArray();
      return res.status(200).json(docs);
    }

    // POST /api/decks
    // body: { appId?, name, cards? }
    if (method === "POST") {
      const { name, cards } = req.body || {};
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: "Missing deck name" });
      }

      const now = new Date();
      const doc = {
        appId,
        name: String(name).trim(),
        createdAt: now,
        updatedAt: now,
        cards: Array.isArray(cards) ? cards : []
      };

      const r = await coll.insertOne(doc);
      return res.status(201).json({ _id: r.insertedId, ...doc });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("API /decks ERROR:", err);
    return res.status(500).json({ error: err.message || "internal error" });
  }
};
