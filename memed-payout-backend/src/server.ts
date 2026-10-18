
import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import {
  authenticateToken,
  AuthRequest
} from "./middleware/auth.middleware.js";

import { allowRoles } from "./middleware/role.middleware.js";
import campaignRoutes from "./routes/campaign.routes.js";
import postRoutes from "./routes/post.routes.js";


const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Middleware must come before routes
app.use(cors());
app.use(express.json());

// Register authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/users", authRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/posts", postRoutes);

// Health-check API
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Meme'd Payout Tracker API is running"
  });
});

app.get(
  "/api/users/me",
  authenticateToken,
  (req: AuthRequest, res) => {
    res.status(200).json({
      success: true,
      user: req.user
    });
  }
);


app.post(
  "/api/test/brand-only",
  authenticateToken,
  allowRoles("brand"),
  (_req, res) => {
    res.status(200).json({
      success: true,
      message: "Brand access granted"
    });
  }
);

async function startServer(): Promise<void> {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
