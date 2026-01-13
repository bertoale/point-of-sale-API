import {
  GetPurchasesById,
  createPurchase,
  editPurchase,
  getAllPurchases,
  getPurchasesReport,
  voidPurchase,
} from "../controllers/purchase.js";
import express from "express";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = express.Router();
router.post("/", authenticate, authorize("owner"), createPurchase);
router.get("/", authenticate, authorize("owner"), getAllPurchases);
router.get("/report", authenticate, authorize("owner"), getPurchasesReport);
router.get("/:id", authenticate, authorize("owner"), GetPurchasesById);
router.put("/:id", authenticate, authorize("owner"), editPurchase);
router.delete("/:id", authenticate, authorize("owner"), voidPurchase);
export default router;
