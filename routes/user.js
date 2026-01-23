import {
  login,
  createUser,
  getUsers,
  UpdateUser,
  logout,
  getSession,
  getUserById,
} from "../controllers/user.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import express from "express";

const router = express.Router();

router.post("/login", login);
router.get("/me", authenticate, getSession);
router.post("/logout", authenticate, logout);
router.post("/", authenticate, authorize("owner"), createUser);
router.get("/", authenticate, authorize("owner"), getUsers);
router.get("/:id", authenticate, authorize("owner"), getUserById);
router.put("/:id", authenticate, authorize("owner"), UpdateUser);
export default router;
