import express from "express";
import { Pool } from "pg";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Electric service URL (for reading data via sync)
const ELECTRIC_URL = process.env.ELECTRIC_URL || "http://localhost:3000";

// Direct database connection (for writes)
const dbPool = new Pool({
  host: process.env.DB_HOST || "database",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "default",
  user: process.env.DB_USER || "administrator",
  password: process.env.DB_PASSWORD || "qixqug-boqjim-3zeqvE",
  ssl: false,
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get("/api/health", (req, res) => {
  res.status(200).send("Healthy!");
});

// Electric proxy endpoint for LiveStore sync
app.get("/api/electric", async (req, res) => {
  try {
    // Extract query parameters from the request
    const queryParams = new URLSearchParams(req.query);

    // Basic auth check (implement proper auth in production)
    const authToken = req.headers.authorization || req.query.auth;
    if (authToken !== (process.env.AUTH_TOKEN || "insecure-token-change-me")) {
      return res.status(401).json({ error: "Invalid auth token" });
    }

    // Proxy the request to Electric
    const electricUrl = `${ELECTRIC_URL}/v1/shape?${queryParams.toString()}`;
    console.log("Proxying to Electric:", electricUrl);

    const response = await fetch(electricUrl);

    if (!response.ok) {
      throw new Error(`Electric API error: ${response.status}`);
    }

    // Forward response headers
    response.headers.forEach((value, key) => {
      if (!key.startsWith("content-encoding")) {
        // Avoid double encoding
        res.setHeader(key, value);
      }
    });

    // Stream the response
    const data = await response.text();
    res.send(data);
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
    console.log("Received LiveStore events:", req.body);

    // For LiveStore 0.3.1, we expect event-sourced data
    // The events should be stored and then processed to update the database
    const { events, storeId } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        error: "Invalid request format. Expected events array.",
      });
    }

    // Store events in a dedicated table for LiveStore
    const client = await dbPool.connect();
    try {
      await client.query("BEGIN");

      // Create LiveStore events table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS livestore_events (
          id SERIAL PRIMARY KEY,
          store_id VARCHAR(255),
          event_name VARCHAR(255),
          event_data JSONB,
          event_number VARCHAR(255),
          client_id VARCHAR(255),
          session_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Insert each event
      for (const event of events) {
        await client.query(
          `
          INSERT INTO livestore_events 
          (store_id, event_name, event_data, event_number, client_id, session_id) 
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
          [
            storeId || "default",
            event.eventName || event.name,
            JSON.stringify(event.data || event),
            event.eventNumber,
            event.clientId,
            event.sessionId,
          ]
        );

        // Process the event to update actual application tables
        await processLiveStoreEvent(client, event);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    res.json({ success: true, processed: events.length });
  } catch (error) {
    console.error("Error processing LiveStore events:", error);
    res.status(500).json({
      error: "Failed to process LiveStore events",
      details: error.message,
    });
  }
});

// Helper function to process individual LiveStore events
async function processLiveStoreEvent(client, event) {
  try {
    const eventName = event.eventName || event.name;
    const data = event.data || event;

    console.log(`Processing event: ${eventName}`, data);

    // Get the ID field (flexible to handle both 'id' and 'bookmark_id')
    const bookmarkId = data.bookmark_id || data.id;

    if (!bookmarkId) {
      console.error(`No ID found in event data:`, data);
      return;
    }

    // Map LiveStore events to database operations
    switch (eventName) {
      case "v1.BookmarkCreated":
        await client.query(
          `
          INSERT INTO bookmarks (bookmark_id, type, content, author_id, folder_id, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (bookmark_id) DO NOTHING
        `,
          [
            bookmarkId,
            data.type,
            data.content,
            data.author_id,
            data.folder_id,
            data.created_at || new Date(),
          ]
        );
        break;

      case "v1.BookmarkUpdated":
        await client.query(
          `
          UPDATE bookmarks 
          SET type = COALESCE($2, type),
              content = COALESCE($3, content),
              folder_id = COALESCE($4, folder_id)
          WHERE bookmark_id = $1
        `,
          [bookmarkId, data.type, data.content, data.folder_id]
        );
        break;

      case "v1.BookmarkDeleted":
        await client.query(
          `
          DELETE FROM bookmarks WHERE bookmark_id = $1
        `,
          [bookmarkId]
        );
        break;

      default:
        console.log(`Unknown event type: ${eventName}`);
    }
  } catch (error) {
    console.error(`Error processing event ${event.eventName}:`, error);
    // Don't throw - let other events process
  }
}
// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, closing database pool...");
  await dbPool.end();
  process.exit(0);
});
