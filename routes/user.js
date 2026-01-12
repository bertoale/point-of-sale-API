import {
  login,
  createUser,
  getUsers,
  UpdateUser,
} from "../controllers/user.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import express from "express";

const router = express.Router();

router.post("/login", login);
router.post("/create", authenticate, authorize("owner"), createUser);
router.get("/", authenticate, authorize("owner"), getUsers);
router.put("/:id", authenticate, authorize("owner"), UpdateUser);
