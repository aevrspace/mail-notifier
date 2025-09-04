// ./src/index.ts

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import emailRouter from "./routes/email.routes.js";
import s3Router from "./routes/s3.routes.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const verifyAccess = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey === process.env.API_KEY) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
};

app.use(cors());

// Middleware
app.use(express.json({ limit: "50mb" })); // for parsing application/json
app.use(express.urlencoded({ extended: true, limit: "50mb" })); // for parsing application/x-www-form-urlencoded

// Routes
app.use("/api", verifyAccess, emailRouter);
app.use("/api/s3", verifyAccess, s3Router);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}/`);
});
