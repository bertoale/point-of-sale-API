import {
  CreateCategory,
  DeleteCategory,
  GetAllCategories,
  GetCategoryById,
  UpdateCategory,
} from "../controllers/category.js";
import express from "express";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = express.Router();
router.post("/", authenticate, authorize("owner"), CreateCategory);
router.get("/", authenticate, authorize("owner"), GetAllCategories);
router.get("/:id", authenticate, authorize("owner"), GetCategoryById);
router.put("/:id", authenticate, authorize("owner"), UpdateCategory);
router.delete("/:id", authenticate, authorize("owner"), DeleteCategory);

export default router;
