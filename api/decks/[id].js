// pages/api/decks/[id].js
const { MongoClient, ObjectId } = require("mongodb");

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
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing id" });

    const db = await getDB();
    const coll = db.collection(
      process.env.MONGODB_COLLECTION_DECKS || "flashcards_decks"
    );

    const method = req.method;
    const appId =
      (method === "PUT" || method === "DELETE"
        ? req.query.appId ?? req.body?.appId
        : undefined) || "default-app-id";

    // PUT /api/decks/:id
    // body: { name?, cards? }
    //
    // A ideia é o front mandar SEMPRE o deck inteiro
    // (com cards já atualizados + info de SRS)
    // e aqui a gente só sobrescreve name/cards.
    if (method === "PUT") {
      const { name, cards } = req.body || {};
      const updateDoc = {
        $set: {
          updatedAt: new Date()
        }
      };

      if (typeof name === "string") {
        updateDoc.$set.name = name.trim();
      }

      if (Array.isArray(cards)) {
        updateDoc.$set.cards = cards;
      }

      const r = await coll.updateOne(
        { _id: new ObjectId(id), appId },
        updateDoc
      );

      return res.status(200).json({
        ok: r.matchedCount === 1,
        modified: r.modifiedCount === 1
      });
    }

    // DELETE /api/decks/:id
    if (method === "DELETE") {
      const r = await coll.deleteOne({ _id: new ObjectId(id), appId });
      return res.status(200).json({ ok: r.deletedCount === 1 });
    }

    res.setHeader("Allow", ["PUT", "DELETE"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("API /decks/[id] ERROR:", err);
    return res.status(500).json({ error: err.message || "internal error" });
  }
};
