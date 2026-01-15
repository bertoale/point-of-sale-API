import { User } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { Success, Error } from "../utils/response.js";
import bcrypt from "bcrypt";
import { Config } from "../configs/config.js";

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  // Cari user berdasarkan email
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return Error(res, 401, "Invalid email or password");
  }
  // Cek password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return Error(res, 401, "Invalid email or password");
  }
  // Buat token JWT
  const token = jwt.sign({ id: user.id }, Config.JWT_SECRET, {
    expiresIn: Config.JWT_EXPIRES_IN,
  });

  // SET COOKIE 🔥
  res.cookie("token", token, {
    httpOnly: true, // tidak bisa diakses JS
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 1 hari
  });

  return Success(res, 200, "Login successful", {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token: token,
  });
});

export const UpdateUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { email, password } = req.body;
  const user = await User.findByPk(userId);
  if (!user) {
    return Error(res, 404, "User not found");
  }
  if (email) user.email = email;
  if (password) user.password = password;
  await user.save();
  return Success(res, 200, "Profile updated successfully");
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, role, email, phone, password } = req.body;
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return Error(res, 400, "Email already in use");
  }
  const newUser = await User.create({ name, role, phone, email, password });
  return Success(res, 201, "User created successfully", {
    id: newUser.id,
    name: newUser.name,
    role: newUser.role,
    email: newUser.email,
    phone: newUser.phone,
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    attributes: ["id", "name", "role", "email", "createdAt", "updatedAt"],
  });
  return Success(res, 200, "Users retrieved successfully", users);
});
