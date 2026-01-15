import {
  GetPurchasesById,
  getAllPurchases,
  getPurchasesByDate,
  createPurchase,
  editPurchase,
  exportPurchaseReportXlsx,
  voidPurchase,
} from "../controllers/purchase.js";
import express from "express";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = express.Router();
router.post("/", authenticate, authorize("owner"), createPurchase);
router.get("/", authenticate, authorize("owner"), getAllPurchases);
router.get("/report", authenticate, authorize("owner"), getPurchasesByDate);
router.get("/:id", authenticate, authorize("owner"), GetPurchasesById);
router.put("/:id", authenticate, authorize("owner"), editPurchase);
router.delete("/:id", authenticate, authorize("owner"), voidPurchase);
router.get(
  "/export/xlsx",

  exportPurchaseReportXlsx
);
export default router;
