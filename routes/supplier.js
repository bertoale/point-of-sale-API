import {
  CreateSupplier,
  DeleteSupplier,
  GetAllSuppliers,
  GetSupplierById,
  UpdateSupplier,
} from "../controllers/supplier.js";
import express from "express";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = express.Router();
router.post("/", authenticate, authorize("owner"), CreateSupplier);
router.get("/", authenticate, authorize("owner"), GetAllSuppliers);
router.get("/:id", authenticate, authorize("owner"), GetSupplierById);
router.put("/:id", authenticate, authorize("owner"), UpdateSupplier);
router.delete("/:id", authenticate, authorize("owner"), DeleteSupplier);

export default router;
