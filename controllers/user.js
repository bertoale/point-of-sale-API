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

  if (!user.isActive) {
    return Error(res, 403, "User account is inactive. Please contact admin.");
  }
  // Buat token JWT
  const token = jwt.sign({ id: user.id, role: user.role }, Config.JWT_SECRET, {
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
  const { name, email, phone, password, role, isActive } = req.body;
  const user = await User.findByPk(userId);
  if (!user) {
    return Error(res, 404, "User not found");
  }

  // Update fields if provided
  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (password) user.password = password;
  if (role) user.role = role;
  if (typeof isActive === "boolean") user.isActive = isActive;

  await user.save();
  return Success(res, 200, "User updated successfully", {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
  });
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, role, email, phone, password, isActive } = req.body;
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return Error(res, 400, "Email already in use");
  }
  const newUser = await User.create({
    name,
    role,
    phone,
    email,
    password,
    isActive: typeof isActive === "boolean" ? isActive : true,
  });
  return Success(res, 201, "User created successfully", {
    id: newUser.id,
    name: newUser.name,
    role: newUser.role,
    email: newUser.email,
    phone: newUser.phone,
    isActive: newUser.isActive,
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    attributes: [
      "id",
      "name",
      "role",
      "phone",
      "isActive",
      "email",
      "createdAt",
      "updatedAt",
    ],
  });
  return Success(res, 200, "Users retrieved successfully", users);
});

export const getUserById = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const user = await User.findByPk(userId, {
    attributes: ["id", "name", "role", "email", "createdAt", "updatedAt"],
  });
  if (!user) {
    return Error(res, 404, "User not found");
  }
  return Success(res, 200, "User retrieved successfully", user);
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token");
  return Success(res, 200, "Logout successful");
});

export const getSession = asyncHandler(async (req, res) => {
  const user = req.user;
  return Success(res, 200, "Session retrieved successfully", {
    id: user.id,
    name: user.name,
    role: user.role,
    token: req.cookies.token,
  });
});
