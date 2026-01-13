import {
  User,
  Purchase,
  Supplier,
  PurchaseDetail,
  Product,
  Category,
  Sequelize,
  sequelize,
} from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Success, Error } from "../utils/response.js";
import { Op } from "sequelize";

export const getAllPurchases = asyncHandler(async (req, res) => {
  const purchases = await Purchase.findAll({
    include: [
      { model: User, attributes: ["id", "name"] },
      { model: Supplier, attributes: ["id", "name", "phoneNumber", "address"] },
      {
        model: PurchaseDetail,
        include: [
          {
            model: Product,
            attributes: [
              "id",
              "name",
              "sellingPrice",
              "purchasePrice",
              "stock",
            ],
            include: [
              {
                model: Category,
                attributes: ["id", "name"],
              },
            ],
          },
        ],
      },
    ],
    order: [
      ["date", "DESC"],
      ["createdAt", "DESC"],
    ],
  });

  if (!purchases || purchases.length === 0) {
    res.status(404);
    throw new Error("Purchases not found");
  }

  return Success(res, 200, "Purchases retrieved successfully", purchases);
});

export const GetPurchasesById = asyncHandler(async (req, res) => {
  const purchaseId = req.params.id;

  if (!purchaseId) {
    return Error(res, 400, "Purchase ID is required");
  }

  const purchase = await Purchase.findByPk(purchaseId, {
    include: [
      { model: User, attributes: ["id", "name"] },
      { model: Supplier, attributes: ["id", "name", "phoneNumber", "address"] },
      {
        model: PurchaseDetail,
        include: [
          {
            model: Product,
            attributes: [
              "id",
              "name",
              "sellingPrice",
              "purchasePrice",
              "stock",
            ],
            include: [
              {
                model: Category,
                attributes: ["id", "name"],
              },
            ],
          },
        ],
      },
    ],
  });
  if (!purchase) {
    return Error(res, 404, "Purchase not found");
  }
  return Success(res, 200, "Purchase retrieved successfully", purchase);
});

export const createPurchase = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { supplierId, items } = req.body;

  // input validation
  if (!userId) {
    return Error(res, 400, "User unauthenticated");
  }
  if (!supplierId || !items || items.length === 0) {
    return Error(res, 400, "Supplier ID, and items are required");
  }

  if (!Array.isArray(items) || items.length === 0) {
    return Error(res, 400, "Items must be minimum one item");
  }

  // check supplier existence
  const supllier = await Supplier.findByPk(supplierId);
  if (!supllier) {
    return Error(res, 404, "Supplier not found");
  }

  const t = await sequelize.transaction();

  try {
    let totalAmount = 0;
    const validatedItems = [];

    // validate items and calculate total amount
    for (const item of items) {
      const productId = item.productId;
      const quantity = item.quantity;
      const unitPrice = item.unitPrice;
      if (!productId || !quantity || !unitPrice) {
        await t.rollback();
        return Error(
          res,
          400,
          "Each item must have productId, quantity, and unitPrice"
        );
      }

      const product = await Product.findByPk(productId);
      if (!product) {
        await t.rollback();
        return Error(res, 404, `Product with ID ${productId} not found`);
      }

      const subtotal = quantity * unitPrice;
      totalAmount += subtotal;

      validatedItems.push({ product, quantity, unitPrice, subtotal });
    }

    // create purchase record
    const purchase = await Purchase.create(
      { totalAmount, supplierId: supplierId, userId: userId },
      { transaction: t }
    );

    // create purchase detail records and update product stock & purchase price
    for (const item of validatedItems) {
      await PurchaseDetail.create(
        {
          purchaseId: purchase.id,
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        },
        { transaction: t }
      );

      // ✅ UPDATE STOCK (atomic operation to prevent race conditions)
      await Product.increment(
        { stock: item.quantity },
        { where: { id: item.product.id }, transaction: t }
      );

      await Product.update(
        { purchasePrice: item.unitPrice },
        { where: { id: item.product.id }, transaction: t }
      );
    }

    await t.commit();

    // fetch the complete purchase with details to return in response
    const completePurchase = await Purchase.findByPk(purchase.id, {
      include: [
        {
          model: Supplier,
          attributes: ["id", "name", "phoneNumber", "address"],
        },
        {
          model: PurchaseDetail,
          include: [
            {
              model: Product,
              attributes: [
                "id",
                "name",
                "sellingPrice",
                "purchasePrice",
                "stock",
              ],
              include: [
                {
                  model: Category,
                  attributes: ["id", "name"],
                },
              ],
            },
          ],
        },
      ],
    });
    return Success(res, 201, "Purchase created successfully", completePurchase);
  } catch (error) {
    await t.rollback();
    throw error; // will be caught by asyncHandler
  }
});

export const voidPurchase = asyncHandler(async (req, res) => {
  const purchaseId = req.params.id;
  if (!purchaseId) {
    return Error(res, 400, "Purchase ID is required");
  }
  const purchase = await Purchase.findByPk(purchaseId, {
    include: [{ model: PurchaseDetail, include: [Product] }],
  });
  if (!purchase) {
    return Error(res, 404, "Purchase not found");
  }
  // start transaction
  const t = await sequelize.transaction();
  try {
    // revert stock for each purchase detail (atomic decrement)
    for (const detail of purchase.PurchaseDetails) {
      await Product.decrement(
        { stock: detail.quantity },
        { where: { id: detail.Product.id }, transaction: t }
      );
    }
    // delete purchase details
    await PurchaseDetail.destroy(
      { where: { purchaseId: purchaseId } },
      { transaction: t }
    );
    // delete purchase
    await purchase.destroy({ transaction: t });
    await t.commit();
    return Success(res, 200, "Purchase voided successfully");
  } catch (error) {
    await t.rollback();
    throw error;
  }
});

export const editPurchase = asyncHandler(async (req, res) => {
  const purchaseId = req.params.id;
  const { date, supplierId, items } = req.body;

  if (!purchaseId) {
    return Error(res, 400, "Purchase ID is required");
  }

  if (!date || !supplierId || !Array.isArray(items) || items.length === 0) {
    return Error(res, 400, "Date, supplierId, and items are required");
  }

  const purchase = await Purchase.findByPk(purchaseId, {
    include: [{ model: PurchaseDetail, include: [Product] }],
  });

  if (!purchase) {
    return Error(res, 404, "Purchase not found");
  }

  const t = await sequelize.transaction();

  try {
    /** 1️⃣ Rollback stok lama (atomic decrement) */
    for (const detail of purchase.PurchaseDetails) {
      await Product.decrement(
        { stock: detail.quantity },
        { where: { id: detail.Product.id }, transaction: t }
      );
    } /** 2️⃣ Hapus purchase detail lama */
    await PurchaseDetail.destroy(
      { where: { purchaseId: purchaseId } },
      { transaction: t }
    );

    /** 3️⃣ Validasi item baru + hitung total */
    let totalAmount = 0;

    for (const item of items) {
      const { productId, quantity, unitPrice } = item;

      if (!productId || !quantity || !unitPrice) {
        return Error(
          res,
          400,
          "Each item must have productId, quantity, and unitPrice"
        );
      }

      const product = await Product.findByPk(productId, { transaction: t });
      if (!product) {
        return Error(res, 404, `Product with ID ${productId} not found`);
      }

      const subtotal = quantity * unitPrice;
      totalAmount += subtotal; /** 4️⃣ Simpan detail baru */
      await PurchaseDetail.create(
        {
          purchaseId: purchaseId,
          productId: productId,
          quantity,
          unitPrice,
          subtotal,
        },
        { transaction: t }
      );

      /** 5️⃣ Update stok + harga beli (atomic increment) */
      await Product.increment(
        { stock: quantity },
        { where: { id: productId }, transaction: t }
      );

      await Product.update(
        { purchasePrice: unitPrice },
        { where: { id: productId }, transaction: t }
      );
    }

    /** 6️⃣ Update purchase header */
    await purchase.update(
      {
        date,
        supplierId,
        totalAmount,
      },
      { transaction: t }
    );

    await t.commit();

    return Success(res, 200, "Purchase updated successfully");
  } catch (error) {
    await t.rollback();
    throw error;
  }
});

export const getPurchasesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return Error(res, 400, "startDate and endDate are required");
  }
  const purchases = await Purchase.findAll({
    where: {
      date: {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      },
    },
    include: [
      { model: Supplier, attributes: ["id", "name", "phoneNumber", "address"] },
      {
        model: PurchaseDetail,
        include: [
          {
            model: Product,
            attributes: [
              "id",
              "name",
              "sellingPrice",
              "purchasePrice",
              "stock",
            ],
            include: [
              {
                model: Category,
                attributes: ["id", "name"],
              },
            ],
          },
        ],
      },
    ],
    order: [
      ["date", "DESC"],
      ["createdAt", "DESC"],
    ],
  });
  return Success(res, 200, "Purchase report generated", purchases);
});
