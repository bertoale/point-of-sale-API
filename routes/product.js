import {
  CreateProduct,
  DeleteProduct,
  GetAllProducts,
  GetProductById,
  UpdateProduct,
} from "../controllers/product.js";
import express from "express";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = express.Router();
router.post("/", authenticate, authorize("owner"), CreateProduct);
router.get("/", authenticate, authorize("owner"), GetAllProducts);
router.get("/:id", authenticate, authorize("owner"), GetProductById);
router.put("/:id", authenticate, authorize("owner"), UpdateProduct);
router.delete("/:id", authenticate, authorize("owner"), DeleteProduct);
export default router;
