// middleware/auth.js
import jwt from "jsonwebtoken";
import models from "../models/index.js";
const { User } = models;

export const authenticate = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers["authorization"];

    // Ambil token dari header atau cookie
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: "Access token missing" });
    }

    // Verifikasi token (pakai try-catch biar bisa pakai async/await)
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    // 🔹 Cek user aktif hanya di e-commerce (misalnya status: aktif)
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User tidak ditemukan" });
    }

    // Simpan user ke request
    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
    };

    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
/**
 * Middleware untuk cek role user
 * - Contoh: hanya admin yang bisa akses
 */
export const authorize = (roles = []) => {
  if (typeof roles === "string") roles = [roles];

  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    // Tambahan: cek jika user tidak punya role
    if (!req.user.role) {
      return res.status(403).json({ message: "Forbidden: role not found" });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient rights" });
    }

    next();
  };
};
