import express from "express";
import cors from "cors";
import { Schema } from "@livestore/livestore";
import { makeElectricUrl } from "@livestore/sync-electric";

import { makeDb } from "./db.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Electric service configuration
const electricHost = process.env.ELECTRIC_URL || "http://localhost:3000";

// Enable CORS for all routes
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);

app.use(express.json());

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get("/api/health", (req, res) => {
  res.status(200).send("Healthy!");
});

// Electric proxy endpoint for LiveStore sync
app.get("/api/electric", async (req, res) => {
  try {
    const searchParams = new URLSearchParams(req.query);
    const { url, storeId, needsInit, payload } = makeElectricUrl({
      electricHost,
      searchParams,
      // You can also provide a sourceId and sourceSecret for Electric Cloud
      // sourceId: 'your-source-id',
      // sourceSecret: 'your-source-secret',
      apiSecret: process.env.ELECTRIC_API_SECRET || "change-me-electric-secret",
    });

    if (
      payload.authToken !== process.env.AUTH_TOKEN &&
      payload.authToken !== "change-me-electric-secret"
    ) {
      return res.status(401).json({ error: "Invalid auth token" });
    }

    // Here we initialize the database if it doesn't exist yet. You might not need this if you
    // already have the necessary tables created in the database.
    if (needsInit) {
      const db = makeDb(storeId);
      await db.migrate();
      await db.disconnect();
    }

    // We are simply proxying the request to the Electric server but you could implement
    // any custom logic here, e.g. auth, rate limiting, etc.
    const electricResponse = await fetch(url);

    // Forward the response from Electric
    const data = await electricResponse.text();

    // Copy headers from Electric response
    electricResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    res.status(electricResponse.status).send(data);
  } catch (error) {
    console.error("Error proxying to Electric:", error);
    res.status(500).json({
      error: "Failed to proxy Electric request",
      details: error.message,
    });
  }
});

// LiveStore event processing endpoint
app.post("/api/electric", async (req, res) => {
  try {
    const payload = req.body;

    // Define a simple schema for the push payload
    const PushPayloadSchema = Schema.Struct({
      storeId: Schema.String,
      batch: Schema.Array(
        Schema.Struct({
          seqNum: Schema.Number,
          parentSeqNum: Schema.Union(Schema.Number, Schema.Null),
          name: Schema.String,
          args: Schema.Unknown,
          clientId: Schema.String,
          sessionId: Schema.String,
        })
      ),
    });

    const parsedPayload = Schema.decodeUnknownSync(PushPayloadSchema)(payload);

    const db = makeDb(parsedPayload.storeId);

    await db.createEvents(parsedPayload.batch);

    await db.disconnect();

    res.json({ success: true });
  } catch (error) {
    console.error("Error processing LiveStore events:", error);
    res.status(500).json({
      error: "Failed to process LiveStore events",
      details: error.message,
    });
  }
});

// Debug endpoint to check database contents
app.get("/api/debug/bookmarks", async (req, res) => {
  try {
    const storeId = req.query.storeId || "default";
    const db = makeDb(storeId);

    const result = await db.debug();

    res.json(result);

    await db.disconnect();
  } catch (error) {
    console.error("Error fetching debug data:", error);
    res.status(500).json({
      error: "Failed to fetch debug data",
      details: error.message,
    });
  }
});
