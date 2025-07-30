import postgres from "postgres";

export const makeDb = (storeId) => {
  // Use the fixed livestore_events table instead of dynamic table names
  const tableName = "livestore_events";

  const sql = postgres({
    database: process.env.DB_NAME || "default",
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "administrator",
    password: process.env.DB_PASSWORD || "qixqug-boqjim-3zeqvE",
    host: process.env.DB_HOST || "localhost",
  });

  // Remove the migrate function since the table already exists
  const migrate = () => {
    console.log("Table livestore_events already exists, skipping migration");
  };

  const debug = async () => {
    const result = await sql`SELECT * FROM ${sql(tableName)}`;
    return result;
  };

  const createEvents = async (events) => {
    const newEvents = [];

    // Insert events without conflict handling since event_number is not unique
    for (const event of events) {
      console.log(
        `Checking event seqNum ${event.seqNum} for table ${tableName}`
      );

      // Check if event already exists before inserting
      const alreadyExists = await isEventProcessed(event);
      if (alreadyExists) {
        console.log(`Event ${event.seqNum} already exists, skipping insertion`);
        continue;
      }

      try {
        await sql`
          INSERT INTO ${sql(tableName)} (
            store_id, 
            event_name, 
            event_data, 
            event_number, 
            client_id, 
            session_id, 
            created_at
          )
          VALUES (
            ${storeId}, 
            ${event.name}, 
            ${JSON.stringify(event.args)}, 
            ${event.seqNum}, 
            ${event.clientId}, 
            ${event.sessionId}, 
            NOW()
          )
        `;
        console.log(`Successfully inserted event seqNum ${event.seqNum}`);
        newEvents.push(event);
      } catch (error) {
        console.error(`Error inserting event seqNum ${event.seqNum}:`, error);
        throw error;
      }
    }

    return newEvents;
  };

  // Check if an event has already been processed
  const isEventProcessed = async (event) => {
    try {
      const result = await sql`
        SELECT COUNT(*) as count 
        FROM ${sql(tableName)} 
        WHERE store_id = ${storeId} 
        AND event_number = ${event.seqNum}
        AND client_id = ${event.clientId}
        AND session_id = ${event.sessionId}
      `;
      return result[0].count > 0;
    } catch (error) {
      console.error(`Error checking if event is processed:`, error);
      return false;
    }
  };

  // Add bookmark operations
  const createBookmark = async (bookmarkData) => {
    try {
      await sql`
        INSERT INTO bookmarks (
          id,
          name,
          folder_id,
          created_at,
          store_id
        )
        VALUES (
          ${bookmarkData.id},
          ${bookmarkData.name},
          ${bookmarkData.folderId},
          NOW(),
          ${storeId}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          folder_id = EXCLUDED.folder_id
      `;
      console.log(`Successfully created/updated bookmark: ${bookmarkData.id}`);
    } catch (error) {
      console.error(`Error creating bookmark ${bookmarkData.id}:`, error);
      throw error;
    }
  };

  const processEvents = async (events) => {
    for (const event of events) {
      console.log(`Processing event: ${event.name}`);

      switch (event.name) {
        case "v1.BookmarkCreated":
          await createBookmark(event.args);
          break;
        case "v1.BookmarkUpdated":
          await createBookmark(event.args);
          break;
        case "v1.BookmarkDeleted":
          // Handle bookmark deletion if needed
          console.log(`Bookmark deleted: ${event.args.id}`);
          break;
        default:
          console.log(`Unknown event type: ${event.name}`);
      }
    }
  };

  return {
    migrate,
    createEvents,
    processEvents,
    debug,
    disconnect: () => sql.end(),
  };
};
