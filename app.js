import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { sequelize } from "./models/index.js";

// Import routes
import userRoutes from "./routes/user.js";
import categoryRoutes from "./routes/category.js";
import saleRoutes from "./routes/sale.js";
import purchaseRoutes from "./routes/purchase.js";
import supplierRoutes from "./routes/supplier.js";
import productRoutes from "./routes/product.js";

import { errorHandler, notFound } from "./utils/errorHandler.js";
import { seedOwnerUser } from "./utils/seederOwner.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    const result = status >= 200 && status < 400 ? "SUCCESS" : "FAILED";

    console.log(
      `[${new Date().toISOString()}] ${req.method} ${
        req.originalUrl
      } - ${status} (${result}) - ${duration}ms`
    );
  });

  next();
});

// Routes
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/products", productRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Point of Sale API is running!",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Not found middleware
app.use(notFound);
// Error handler middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    await sequelize.sync({ force: false });
    seedOwnerUser();
    console.log("✅ Database synced successfully.");

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📍 Local: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
    process.exit(1);
  }
};

startServer();
