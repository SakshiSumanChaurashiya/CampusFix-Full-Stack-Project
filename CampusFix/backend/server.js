const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "campusfix.sqlite");
const ADMIN_KEY = process.env.ADMIN_KEY || "";

fs.mkdirSync(path.dirname(path.resolve(DB_PATH)), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    reporter TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open'
      CHECK(status IN ('open', 'in-progress', 'resolved')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "30kb" }));

function toIssue(row) {
  return {
    id: row.id,
    ticketCode: row.ticket_code,
    title: row.title,
    category: row.category,
    location: row.location,
    description: row.description,
    reporter: row.reporter,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getStats() {
  const row = db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open,
      SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) AS inProgress,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved
    FROM issues
  `).get();
  return {
    total: row.total || 0,
    open: row.open || 0,
    inProgress: row.inProgress || 0,
    resolved: row.resolved || 0
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "CampusFix API" });
});

app.get("/api/issues", (req, res) => {
  const status = String(req.query.status || "").trim();
  const allowed = ["open", "in-progress", "resolved"];
  if (status && !allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status filter." });
  }
  const rows = status
    ? db.prepare("SELECT * FROM issues WHERE status = ? ORDER BY id DESC").all(status)
    : db.prepare("SELECT * FROM issues ORDER BY id DESC").all();
  res.json({ issues: rows.map(toIssue), stats: getStats() });
});

app.get("/api/issues/:ticketCode", (req, res) => {
  const row = db.prepare("SELECT * FROM issues WHERE ticket_code = ?").get(req.params.ticketCode);
  if (!row) return res.status(404).json({ error: "Report not found." });
  res.json({ issue: toIssue(row) });
});

app.post("/api/issues", (req, res) => {
  const body = req.body || {};
  const title = String(body.title || "").trim();
  const category = String(body.category || "Other").trim();
  const location = String(body.location || "").trim();
  const description = String(body.description || "").trim();
  const reporter = String(body.reporter || "").trim();

  if (title.length < 4 || title.length > 100) {
    return res.status(400).json({ error: "Title must be between 4 and 100 characters." });
  }
  if (location.length < 2 || location.length > 120) {
    return res.status(400).json({ error: "Location must be between 2 and 120 characters." });
  }
  if (description.length < 10 || description.length > 1000) {
    return res.status(400).json({ error: "Description must be between 10 and 1000 characters." });
  }
  if (reporter.length > 60) {
    return res.status(400).json({ error: "Name must be 60 characters or fewer." });
  }
  const allowedCategories = ["Electrical", "Plumbing", "Cleanliness", "Furniture", "Internet", "Safety", "Other"];
  if (!allowedCategories.includes(category)) {
    return res.status(400).json({ error: "Please choose a valid category." });
  }

  const ticketCode = `CF-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const result = db.prepare(`
    INSERT INTO issues (ticket_code, title, category, location, description, reporter)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(ticketCode, title, category, location, description, reporter);

  const issue = db.prepare("SELECT * FROM issues WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ message: "Report submitted successfully.", issue: toIssue(issue) });
});

app.patch("/api/issues/:ticketCode/status", (req, res) => {
  if (!ADMIN_KEY || req.get("x-admin-key") !== ADMIN_KEY) {
    return res.status(401).json({ error: "Admin authorization required." });
  }
  const status = String((req.body || {}).status || "");
  if (!["open", "in-progress", "resolved"].includes(status)) {
    return res.status(400).json({ error: "Status must be open, in-progress or resolved." });
  }
  const result = db.prepare(`
    UPDATE issues SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE ticket_code = ?
  `).run(status, req.params.ticketCode);
  if (!result.changes) return res.status(404).json({ error: "Report not found." });
  const issue = db.prepare("SELECT * FROM issues WHERE ticket_code = ?").get(req.params.ticketCode);
  res.json({ message: "Status updated.", issue: toIssue(issue) });
});

// In production, Express serves the built React application from the same origin.
const frontendDist = path.join(__dirname, "..", "frontend", "dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => res.sendFile(path.join(frontendDist, "index.html")));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Unexpected server error." });
});

app.listen(PORT, () => {
  console.log(`CampusFix server running on port ${PORT}`);
});
