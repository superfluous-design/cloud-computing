const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const port = 3005;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Increase limit for large imports

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "electric",
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "your-secret-key",
    (err, user) => {
      if (err) {
        return res.status(403).json({ error: "Invalid token" });
      }
      req.user = user;
      next();
    }
  );
};

// Export user's bookmarks and folders
app.get("/export", authenticateToken, async (req, res) => {
  try {
    // Get folders
    const foldersResult = await pool.query(
      "SELECT folder_id, name, created_at FROM folders WHERE author_id = $1 ORDER BY created_at ASC",
      [req.user.user_id]
    );

    // Get bookmarks
    const bookmarksResult = await pool.query(
      "SELECT bookmark_id, content, type, title, url, folder_id, created_at FROM bookmarks WHERE author_id = $1 ORDER BY created_at DESC",
      [req.user.user_id]
    );

    const exportData = {
      folders: foldersResult.rows.map((folder) => ({
        id: folder.folder_id,
        name: folder.name,
        createdAt: folder.created_at,
      })),
      bookmarks: bookmarksResult.rows.map((bookmark) => ({
        id: bookmark.bookmark_id,
        content: bookmark.content,
        type: bookmark.type,
        title: bookmark.title,
        url: bookmark.url,
        folderId: bookmark.folder_id,
        createdAt: bookmark.created_at,
      })),
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.email,
    };

    res.json(exportData);
  } catch (error) {
    console.error("Error exporting data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Import bookmarks and folders
app.post("/import", authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { folders, bookmarks, replaceExisting = false } = req.body;

    if (
      !folders ||
      !bookmarks ||
      !Array.isArray(folders) ||
      !Array.isArray(bookmarks)
    ) {
      return res.status(400).json({ error: "Invalid import data format" });
    }

    await client.query("BEGIN");

    let importStats = {
      foldersImported: 0,
      bookmarksImported: 0,
      foldersSkipped: 0,
      bookmarksSkipped: 0,
      errors: [],
    };

    // If replaceExisting is true, delete all existing data
    if (replaceExisting) {
      await client.query("DELETE FROM bookmarks WHERE author_id = $1", [
        req.user.user_id,
      ]);
      await client.query("DELETE FROM folders WHERE author_id = $1", [
        req.user.user_id,
      ]);
    }

    // Import folders first
    const folderMapping = {}; // Map old IDs to new IDs

    for (const folder of folders) {
      try {
        // Generate new ID to avoid conflicts
        const newFolderId = `${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        // Check if folder name already exists (if not replacing)
        if (!replaceExisting) {
          const existingFolder = await client.query(
            "SELECT folder_id FROM folders WHERE name = $1 AND author_id = $2",
            [folder.name, req.user.user_id]
          );

          if (existingFolder.rows.length > 0) {
            folderMapping[folder.id] = existingFolder.rows[0].folder_id;
            importStats.foldersSkipped++;
            continue;
          }
        }

        await client.query(
          "INSERT INTO folders (folder_id, name, author_id) VALUES ($1, $2, $3)",
          [newFolderId, folder.name, req.user.user_id]
        );

        folderMapping[folder.id] = newFolderId;
        importStats.foldersImported++;
      } catch (error) {
        importStats.errors.push(
          `Error importing folder "${folder.name}": ${error.message}`
        );
      }
    }

    // Create default folder if none exists
    const defaultFolderId = `default-${req.user.user_id}`;
    const defaultFolderExists = await client.query(
      "SELECT folder_id FROM folders WHERE folder_id = $1",
      [defaultFolderId]
    );

    if (defaultFolderExists.rows.length === 0) {
      await client.query(
        "INSERT INTO folders (folder_id, name, author_id) VALUES ($1, $2, $3)",
        [defaultFolderId, "General", req.user.user_id]
      );
    }

    // Import bookmarks
    for (const bookmark of bookmarks) {
      try {
        // Generate new ID to avoid conflicts
        const newBookmarkId = `${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        // Map folder ID or use default
        const folderId = folderMapping[bookmark.folderId] || defaultFolderId;

        await client.query(
          `INSERT INTO bookmarks (bookmark_id, content, type, title, url, folder_id, author_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            newBookmarkId,
            bookmark.content,
            bookmark.type,
            bookmark.title,
            bookmark.url,
            folderId,
            req.user.user_id,
          ]
        );

        importStats.bookmarksImported++;
      } catch (error) {
        importStats.errors.push(
          `Error importing bookmark "${bookmark.content}": ${error.message}`
        );
      }
    }

    await client.query("COMMIT");

    res.json({
      message: "Import completed",
      stats: importStats,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error importing data:", error);
    res.status(500).json({ error: "Import failed: " + error.message });
  } finally {
    client.release();
  }
});

// Bulk operations
app.post("/bulk-delete", authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { bookmarkIds, folderIds } = req.body;

    if (
      (!bookmarkIds || !Array.isArray(bookmarkIds)) &&
      (!folderIds || !Array.isArray(folderIds))
    ) {
      return res.status(400).json({ error: "No valid IDs provided" });
    }

    await client.query("BEGIN");

    let deletedBookmarks = 0;
    let deletedFolders = 0;

    // Delete bookmarks
    if (bookmarkIds && bookmarkIds.length > 0) {
      const placeholders = bookmarkIds.map((_, i) => `$${i + 2}`).join(", ");
      const result = await client.query(
        `DELETE FROM bookmarks WHERE bookmark_id IN (${placeholders}) AND author_id = $1`,
        [req.user.user_id, ...bookmarkIds]
      );
      deletedBookmarks = result.rowCount;
    }

    // Delete folders (and move their bookmarks to default)
    if (folderIds && folderIds.length > 0) {
      const defaultFolderId = `default-${req.user.user_id}`;

      for (const folderId of folderIds) {
        // Skip default folder
        if (folderId.startsWith("default-")) continue;

        // Move bookmarks to default folder
        await client.query(
          "UPDATE bookmarks SET folder_id = $1 WHERE folder_id = $2 AND author_id = $3",
          [defaultFolderId, folderId, req.user.user_id]
        );

        // Delete folder
        const result = await client.query(
          "DELETE FROM folders WHERE folder_id = $1 AND author_id = $2",
          [folderId, req.user.user_id]
        );

        if (result.rowCount > 0) {
          deletedFolders++;
        }
      }
    }

    await client.query("COMMIT");

    res.json({
      message: "Bulk deletion completed",
      deletedBookmarks,
      deletedFolders,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in bulk delete:", error);
    res.status(500).json({ error: "Bulk deletion failed: " + error.message });
  } finally {
    client.release();
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "express4-export" });
});

app.listen(port, () => {
  console.log(`Export service listening on port ${port}`);
});
