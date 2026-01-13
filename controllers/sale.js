import {
  Sale,
  SaleDetail,
  Product,
  Category,
  User,
  sequelize,
} from "../models/index.js";
import user from "../models/user.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Success, Error } from "../utils/response.js";
import { Op } from "sequelize";

export const getAllSales = asyncHandler(async (req, res) => {
  const sales = await Sale.findAll({
    include: [
      {
        model: SaleDetail,
        as: "saleDetails",
        include: [
          {
            model: Product,
            as: "product",
            include: [
              {
                model: Category,
                as: "category",
              },
            ],
          },
        ],
      },
      {
        model: User,
        as: "cashier",
        attributes: ["id", "name", "email", "role"],
      },
    ],
  });
  return Success(res, 200, "Sales retrieved successfully", sales);
});

export const getSaleById = asyncHandler(async (req, res) => {
  const saleId = req.params.id;
  const sale = await Sale.findByPk(saleId, {
    include: [
      {
        model: SaleDetail,
        as: "saleDetails",
        include: [
          {
            model: Product,
            as: "product",
            include: [
              {
                model: Category,
                as: "category",
              },
            ],
          },
        ],
      },
      {
        model: User,
        as: "cashier",
        attributes: ["id", "name", "email", "role"],
      },
    ],
  });
  if (!sale) {
    return Error(res, 404, "Sale not found");
  }
  return Success(res, 200, "Sale retrieved successfully", sale);
});

export const getSaleByCashierAndDate = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate } = req.query;

  if (!userId) {
    return Error(res, 400, "User unauthenticated");
  }
  const sales = await Sale.findAll({
    where: {
      userId: userId,
      date: {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      },
    },
    include: [
      {
        model: SaleDetail,
        as: "saleDetails",
        include: [
          {
            model: Product,
            as: "product",
            include: [
              {
                model: Category,
                as: "category",
              },
            ],
          },
        ],
      },
      {
        model: User,
        as: "cashier",
        attributes: ["id", "name", "email", "role"],
      },
    ],
  });
  return Success(res, 200, "Sales retrieved successfully", { sales });
});

export const createSale = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { items } = req.body;

  if (!userId) {
    return Error(res, 400, "User unauthenticated");
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return Error(res, 400, "Invalid sale data");
  }

  const t = await sequelize.transaction();

  try {
    let totalPrice = 0;
    let validatedItems = [];

    // Validate items and calculate total price
    for (const item of items) {
      const productId = item.productId;
      const quantity = item.quantity;
      const unitPrice = item.unitPrice;
      if (!productId || !quantity || !unitPrice) {
        throw new Error(
          "Each item must have productId, quantity, and unitPrice"
        );
      }

      const product = await Product.findByPk(productId, { transaction: t });
      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      const subtotal = quantity * unitPrice;
      totalPrice += subtotal;
      validatedItems.push({
        productId: product.id,
        quantity,
        unitPrice,
        subtotal,
      });
    }

    // Create sale record
    const sales = await Sale.create(
      {
        totalPrice,
        userId: userId,
      },
      { transaction: t }
    );

    // Create sale details and update product stock
    for (const item of validatedItems) {
      await SaleDetail.create(
        {
          saleId: sales.id,
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        },
        { transaction: t }
      );

      // Decrement stock atomically (race condition safe)
      await Product.decrement(
        { stock: item.quantity },
        { where: { id: item.product.id }, transaction: t }
      );
    }

    await t.commit();
    const completeSale = await Sale.findByPk(sales.id, {
      include: [
        {
          model: SaleDetail,
          as: "saleDetails",
          include: [
            {
              model: Product,
              as: "product",
              include: [
                {
                  model: Category,
                  as: "category",
                },
              ],
            },
          ],
        },
        {
          model: User,
          as: "cashier",
          attributes: ["id", "name", "email", "role"],
        },
      ],
    });
    return Success(res, 201, "Sale created successfully", completeSale);
  } catch (error) {
    await t.rollback();
    return Error(res, 500, { message: error.message });
  }
});

export const voidSale = asyncHandler(async (req, res) => {
  const saleId = req.params.id;

  if (!saleId) {
    return Error(res, 400, "Sale ID is required");
  }
  const sale = await Sale.findByPk(saleId, {
    include: [{ model: SaleDetail, include: [{ model: Product }] }],
  });
  if (!sale) {
    return Error(res, 404, "Sale not found");
  }

  const t = await sequelize.transaction();
  try {
    // Rollback stock (atomic increment)
    for (const detail of sale.saleDetails) {
      await Product.increment(
        { stock: detail.quantity },
        { where: { id: detail.Product.id }, transaction: t }
      );
    }

    // Delete sale details
    await SaleDetail.destroy({ where: { saleId } }, { transaction: t });
    // Delete sale
    await Sale.destroy({ where: { id: saleId } }, { transaction: t });
    await t.commit();
    return Success(res, 200, { message: "Sale voided successfully" });
  } catch (error) {
    await t.rollback();
    return Error(res, 500, { message: error.message });
  }
});

export const getSalesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return Error(res, 400, "startDate and endDate are required");
  }
  const sales = await Sale.findAll({
    where: {
      date: {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      },
    },
    include: [
      {
        model: SaleDetail,
        as: "saleDetails",
        include: [
          {
            model: Product,
            as: "product",
            include: [
              {
                model: Category,
                as: "category",
              },
            ],
          },
        ],
      },
      {
        model: User,
        as: "cashier",
        attributes: ["id", "name", "email", "role"],
      },
    ],
  });
  return Success(res, 200, "Sales retrieved successfully", sales);
});

export const editSale = asyncHandler(async (req, res) => {
  const saleId = req.params.id;
  const { items } = req.body;

  if (!saleId) {
    return Error(res, 400, "Sale ID is required");
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return Error(res, 400, "Items are required");
  }

  const sale = await Sale.findByPk(saleId, {
    include: [{ model: SaleDetail, as: "saleDetails" }],
  });

  if (!sale) {
    return Error(res, 404, "Sale not found");
  }

  // if (sale.status === "voided") {
  //   return Error(res, 400, "Voided sale cannot be edited");
  // }

  await sequelize.transaction(async (t) => {
    /** 1️⃣ Rollback stok lama (atomic increment) */
    for (const detail of sale.saleDetails) {
      await Product.increment(
        { stock: detail.quantity },
        { where: { id: detail.productId }, transaction: t }
      );
    }

    /** 2️⃣ Hapus sale detail lama */
    await SaleDetail.destroy({ where: { saleId } }, { transaction: t });

    /** 3️⃣ Validasi & simpan item baru */
    for (const item of items) {
      const { productId, quantity, unitPrice } = item;

      if (!productId || !quantity || !unitPrice) {
        throw new Error(
          "Each item must have productId, quantity, and unitPrice"
        );
      }

      const product = await Product.findByPk(productId, { transaction: t });
      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      if (product.stock < quantity) {
        throw new Error(
          `Insufficient stock for product ID ${productId}. Available: ${product.stock}, Requested: ${quantity}`
        );
      }

      await SaleDetail.create(
        { saleId, productId, quantity, unitPrice },
        { transaction: t }
      );

      /** 4️⃣ Kurangi stok baru (atomic decrement) */
      await Product.decrement(
        { stock: quantity },
        { where: { id: productId }, transaction: t }
      );
    }
  });

  return Success(res, 200, "Sale updated successfully");
});
