import { User } from "../models/index.js";
import { Op } from "sequelize";

export async function seedOwnerUser() {
  const name = "Owner";
  const email = "owner@email.com";
  const password = "11111111";
  const role = "owner";
  const isActive = true;
  const phone = "+6200000000000";

  const existing = await User.count({
    where: {
      [Op.or]: [{ email }, { phone }],
    },
  });

  if (existing === 0) {
    try {
      await User.create({
        name,
        email,
        password,
        role,
        isActive,
        phone,
      });
      console.log("User owner berhasil dibuat.");
    } catch (err) {
      console.error("Gagal membuat user owner:", err);
    }
  } else {
    console.log("User owner sudah ada.");
  }
}
