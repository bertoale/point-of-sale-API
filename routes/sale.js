import {
  createSale,
  editSale,
  getAllSales,
  getSaleByCashierAndDate,
  // getsaleByCurrentUserAndDate,
  getSaleById,
  getSalesReport,
  voidSale,
} from "../controllers/sale.js";
import express from "express";
import { authenticate, authorize } from "../middlewares/auth.js";
const router = express.Router();
router.post("/", authenticate, authorize(["cashier", "owner"]), createSale);
router.get("/report", authenticate, authorize("owner"), getSalesReport);
router.get(
  "/cashier/:cashierId/date/:date",
  authenticate,
  authorize("owner", "cashier"),
  getSaleByCashierAndDate
);
router.get("/", authenticate, authorize("owner"), getAllSales);
router.get("/:id", authenticate, authorize("owner"), getSaleById);
router.put("/:id", authenticate, authorize("owner"), editSale);
router.delete("/:id", authenticate, authorize("owner"), voidSale);
export default router;
