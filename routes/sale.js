import {
  getSaleByCashierAndDate,
  getSaleByCurrentUserAndDate,
  getProfitByDate,
  getProfitPerProduct,
  getSaleById,
  getSalesByDate,
  getAllSales,
  createSale,
  editSale,
  voidSale,
  exportSalesReportXlsx,
} from "../controllers/sale.js";
import express from "express";
import { authenticate, authorize } from "../middlewares/auth.js";
const router = express.Router();
router.post("/", authenticate, authorize(["cashier", "owner"]), createSale);
router.get("/report", authenticate, authorize("owner"), getSalesByDate);
router.get(
  "/me/",
  authenticate,
  authorize(["owner", "cashier"]),
  getSaleByCurrentUserAndDate
);
router.get("/", authenticate, authorize("owner"), getAllSales);
router.get("/:id", authenticate, authorize("owner"), getSaleById);
router.put("/:id", authenticate, authorize("owner"), editSale);
router.delete("/:id", authenticate, authorize("owner"), voidSale);
router.get(
  "/export/xlsx",
  authenticate,
  authorize("owner"),
  exportSalesReportXlsx
);
router.get(
  "/cashier/:cashierId",
  authenticate,
  authorize("owner"),
  getSaleByCashierAndDate
);
router.get("/profit/date", authenticate, authorize("owner"), getProfitByDate);
router.get(
  "/profit/product",
  authenticate,
  authorize("owner"),
  getProfitPerProduct
);
export default router;
