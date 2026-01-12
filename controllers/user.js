import { User } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { Success, Error } from "../utils/response.js";

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user || !(await user.validPassword(password))) {
    return Error(res, 401, "Invalid email or password");
  }
  const token = jwt.sign(
    { id: user.id, email: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  return Success(res, 200, { token });
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
  return Success(res, 200, { message: "Profile updated successfully" });
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, role, email, password } = req.body;
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return Error(res, 400, "Email already in use");
  }
  const newUser = await User.create({ name, role, email, password });
  return Success(res, 201, {
    id: newUser.id,
    name: newUser.name,
    role: newUser.role,
    email: newUser.email,
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    attributes: ["id", "name", "role", "email", "createdAt", "updatedAt"],
  });
  return Success(res, 200, users);
});
