const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const port = 3004;

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

// Get all folders for user
app.get("/folders", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, COUNT(b.bookmark_id) as bookmark_count
       FROM folders f 
       LEFT JOIN bookmarks b ON f.folder_id = b.folder_id 
       WHERE f.author_id = $1 
       GROUP BY f.folder_id, f.name, f.created_at, f.author_id
       ORDER BY f.created_at ASC`,
      [req.user.user_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching folders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new folder
app.post("/folders", authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Folder name is required" });
    }

    // Check if folder with same name already exists for user
    const existingFolder = await pool.query(
      "SELECT folder_id FROM folders WHERE name = $1 AND author_id = $2",
      [name.trim(), req.user.user_id]
    );

    if (existingFolder.rows.length > 0) {
      return res
        .status(409)
        .json({ error: "Folder with this name already exists" });
    }

    const folderId = Date.now().toString();

    const result = await pool.query(
      `INSERT INTO folders (folder_id, name, author_id) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [folderId, name.trim(), req.user.user_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update folder
app.put("/folders/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Folder name is required" });
    }

    // Verify folder belongs to user
    const folderCheck = await pool.query(
      "SELECT folder_id FROM folders WHERE folder_id = $1 AND author_id = $2",
      [id, req.user.user_id]
    );

    if (folderCheck.rows.length === 0) {
      return res.status(404).json({ error: "Folder not found" });
    }

    // Check if another folder with same name already exists for user
    const existingFolder = await pool.query(
      "SELECT folder_id FROM folders WHERE name = $1 AND author_id = $2 AND folder_id != $3",
      [name.trim(), req.user.user_id, id]
    );

    if (existingFolder.rows.length > 0) {
      return res
        .status(409)
        .json({ error: "Folder with this name already exists" });
    }

    const result = await pool.query(
      `UPDATE folders 
       SET name = $1
       WHERE folder_id = $2 AND author_id = $3
       RETURNING *`,
      [name.trim(), id, req.user.user_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating folder:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete folder
app.delete("/folders/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deletion of default folder
    if (id.startsWith("default-")) {
      return res.status(400).json({ error: "Cannot delete default folder" });
    }

    // Check if folder exists and belongs to user
    const folderCheck = await pool.query(
      "SELECT folder_id FROM folders WHERE folder_id = $1 AND author_id = $2",
      [id, req.user.user_id]
    );

    if (folderCheck.rows.length === 0) {
      return res.status(404).json({ error: "Folder not found" });
    }

    // Get user's default folder
    const defaultFolder = await pool.query(
      "SELECT folder_id FROM folders WHERE folder_id = $1 AND author_id = $2",
      [`default-${req.user.user_id}`, req.user.user_id]
    );

    if (defaultFolder.rows.length === 0) {
      return res.status(500).json({ error: "Default folder not found" });
    }

    // Move all bookmarks to default folder before deleting
    await pool.query(
      "UPDATE bookmarks SET folder_id = $1 WHERE folder_id = $2 AND author_id = $3",
      [defaultFolder.rows[0].folder_id, id, req.user.user_id]
    );

    // Delete the folder
    const result = await pool.query(
      "DELETE FROM folders WHERE folder_id = $1 AND author_id = $2 RETURNING *",
      [id, req.user.user_id]
    );

    res.json({ message: "Folder deleted successfully", moved_bookmarks: true });
  } catch (error) {
    console.error("Error deleting folder:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Initialize default folder for user (called after registration)
app.post("/folders/init-default", authenticateToken, async (req, res) => {
  try {
    const defaultFolderId = `default-${req.user.user_id}`;

    // Check if default folder already exists
    const existingFolder = await pool.query(
      "SELECT folder_id FROM folders WHERE folder_id = $1",
      [defaultFolderId]
    );

    if (existingFolder.rows.length > 0) {
      return res.json({ message: "Default folder already exists" });
    }

    // Create default folder
    const result = await pool.query(
      `INSERT INTO folders (folder_id, name, author_id) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [defaultFolderId, "General", req.user.user_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating default folder:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "express3-folders" });
});

app.listen(port, () => {
  console.log(`Folder service listening on port ${port}`);
});
