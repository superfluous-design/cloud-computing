const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const port = 3003;

// Middleware
app.use(cors());
app.use(express.json());

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

// Get all bookmarks for user
app.get("/bookmarks", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, f.name as folder_name 
       FROM bookmarks b 
       LEFT JOIN folders f ON b.folder_id = f.folder_id 
       WHERE b.author_id = $1 
       ORDER BY b.created_at DESC`,
      [req.user.user_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new bookmark
app.post("/bookmarks", authenticateToken, async (req, res) => {
  try {
    const { content, type, title, url, folder_id } = req.body;

    if (!content || !type || !folder_id) {
      return res
        .status(400)
        .json({ error: "Content, type, and folder_id are required" });
    }

    // Verify folder belongs to user
    const folderCheck = await pool.query(
      "SELECT folder_id FROM folders WHERE folder_id = $1 AND author_id = $2",
      [folder_id, req.user.user_id]
    );

    if (folderCheck.rows.length === 0) {
      return res.status(404).json({ error: "Folder not found" });
    }

    const bookmarkId = Date.now().toString();

    const result = await pool.query(
      `INSERT INTO bookmarks (bookmark_id, content, type, title, url, folder_id, author_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [bookmarkId, content, type, title, url, folder_id, req.user.user_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating bookmark:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update bookmark
app.put("/bookmarks/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, type, title, url, folder_id } = req.body;

    // Verify bookmark belongs to user
    const bookmarkCheck = await pool.query(
      "SELECT bookmark_id FROM bookmarks WHERE bookmark_id = $1 AND author_id = $2",
      [id, req.user.user_id]
    );

    if (bookmarkCheck.rows.length === 0) {
      return res.status(404).json({ error: "Bookmark not found" });
    }

    // If folder_id is provided, verify it belongs to user
    if (folder_id) {
      const folderCheck = await pool.query(
        "SELECT folder_id FROM folders WHERE folder_id = $1 AND author_id = $2",
        [folder_id, req.user.user_id]
      );

      if (folderCheck.rows.length === 0) {
        return res.status(404).json({ error: "Folder not found" });
      }
    }

    const result = await pool.query(
      `UPDATE bookmarks 
       SET content = COALESCE($1, content),
           type = COALESCE($2, type),
           title = COALESCE($3, title),
           url = COALESCE($4, url),
           folder_id = COALESCE($5, folder_id)
       WHERE bookmark_id = $6 AND author_id = $7
       RETURNING *`,
      [content, type, title, url, folder_id, id, req.user.user_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating bookmark:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete bookmark
app.delete("/bookmarks/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM bookmarks WHERE bookmark_id = $1 AND author_id = $2 RETURNING *",
      [id, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Bookmark not found" });
    }

    res.json({ message: "Bookmark deleted successfully" });
  } catch (error) {
    console.error("Error deleting bookmark:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "express2-bookmarks" });
});

app.listen(port, () => {
  console.log(`Bookmark service listening on port ${port}`);
});
