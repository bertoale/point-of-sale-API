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
import ExcelJS from "exceljs";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Success, Error } from "../utils/response.js";
import { Op } from "sequelize";

export const getAllPurchases = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const whereClause = {};

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    whereClause.date = {
      [Op.between]: [start, end],
    };
  }

  const purchases = await Purchase.findAll({
    where: whereClause,
    include: [
      { association: "user", attributes: ["id", "name"] },
      {
        association: "supplier",
        attributes: ["id", "name", "phoneNumber", "address"],
      },
      {
        association: "purchaseDetail",
        include: [
          {
            association: "product",
            attributes: ["id", "name", "purchasePrice"],
          },
        ],
      },
    ],
    order: [
      ["date", "DESC"],
      ["createdAt", "DESC"],
    ],
  });

  return Success(res, 200, "Purchases retrieved successfully", purchases);
});

export const GetPurchasesById = asyncHandler(async (req, res) => {
  const purchaseId = req.params.id;

  if (!purchaseId) {
    return Error(res, 400, "Purchase ID is required");
  }

  const purchase = await Purchase.findByPk(purchaseId, {
    include: [
      { model: User, as: "user", attributes: ["id", "name"] },
      { model: Supplier, as: "supplier", attributes: ["id", "name"] },
      {
        model: PurchaseDetail,
        as: "purchaseDetail",
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "purchasePrice"],
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
        return Error(
          res,
          400,
          "Each item must have productId, quantity, and unitPrice"
        );
      }

      const product = await Product.findByPk(productId);
      if (!product) {
        return Error(res, 400, `Product with ID ${productId} not found`);
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

    // Commit transaction before fetching complete purchase
    await t.commit();

    // fetch the complete purchase with details to return in response (outside transaction)
    // const completePurchase = await Purchase.findByPk(purchase.id, {
    //   include: [
    //     {
    //       model: Supplier,
    //       attributes: ["id", "name"],
    //     },
    //     {
    //       model: PurchaseDetail,
    //       include: [
    //         {
    //           model: Product,
    //           attributes: [
    //             "id",
    //             "name",
    //             "sellingPrice",
    //             "purchasePrice",
    //             "stock",
    //           ],
    //           include: [
    //             {
    //               model: Category,
    //               attributes: ["id", "name"],
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //   ],
    // });
    return Success(res, 201, "Purchase created successfully");
  } catch (error) {
    // Only rollback if transaction hasn't been committed yet
    if (!t.finished) {
      await t.rollback();
    }
    throw error; // will be caught by asyncHandler
  }
});

export const voidPurchase = asyncHandler(async (req, res) => {
  const purchaseId = req.params.id;
  if (!purchaseId) {
    return Error(res, 400, "Purchase ID is required");
  }
  const purchase = await Purchase.findByPk(purchaseId, {
    include: [
      {
        model: PurchaseDetail,
        as: "purchaseDetail",
        include: { model: Product, as: "product" },
      },
    ],
  });
  if (!purchase) {
    return Error(res, 404, "Purchase not found");
  }
  // start transaction
  const t = await sequelize.transaction();
  try {
    // revert stock for each purchase detail (atomic decrement)
    for (const detail of purchase.purchaseDetail) {
      await Product.decrement(
        { stock: detail.quantity },
        { where: { id: detail.product.id }, transaction: t }
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
  const { supplierId, items } = req.body;

  if (!purchaseId) {
    return Error(res, 400, "Purchase ID is required");
  }

  if (!supplierId || !Array.isArray(items) || items.length === 0) {
    return Error(res, 400, "SupplierId, and items are required");
  }

  const purchase = await Purchase.findByPk(purchaseId, {
    include: [
      {
        model: PurchaseDetail,
        as: "purchaseDetail",
        include: [{ model: Product, as: "product" }],
      },
    ],
  });

  if (!purchase) {
    return Error(res, 404, "Purchase not found");
  }

  const t = await sequelize.transaction();

  try {
    /** 1️⃣ Rollback stok lama (atomic decrement) */
    for (const detail of purchase.purchaseDetail) {
      await Product.decrement(
        { stock: detail.quantity },
        { where: { id: detail.product.id }, transaction: t }
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

export const getPurchasesByDate = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return Error(res, 400, "startDate and endDate are required");
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setDate(end.getDate() + 1); // +1 hari

  const purchases = await Purchase.findAll({
    where: {
      date: {
        [Op.between]: [start, end],
      },
    },
    include: [
      {
        model: Supplier,
        as: "supplier",
        attributes: ["id", "name", "phoneNumber", "address"],
      },
      {
        model: PurchaseDetail,
        as: "purchaseDetail",
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "purchasePrice"],
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

export const exportPurchaseReportXlsx = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return Error(res, 400, "startDate and endDate are required");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const formatDDMMYY = (date) => {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${String(d.getFullYear()).slice(-2)}`;
  };

  const purchases = await Purchase.findAll({
    where: {
      date: { [Op.between]: [start, end] },
    },
    include: [
      { association: "user", attributes: ["name"] },
      { association: "supplier", attributes: ["name"] },
      {
        association: "purchaseDetail",
        include: [{ association: "product", attributes: ["name"] }],
      },
    ],
    order: [["date", "ASC"]],
  });

  // =========================
  // CREATE EXCEL
  // =========================
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Purchase Report");

  worksheet.columns = [
    { header: "Purchase ID", key: "purchaseId", width: 12 },
    { header: "Tanggal", key: "date", width: 20 },
    { header: "Kasir", key: "kasir", width: 18 },
    { header: "Supplier", key: "supplier", width: 25 },
    { header: "Produk", key: "product", width: 35 },
    { header: "Qty", key: "qty", width: 8 },
    { header: "Harga Beli", key: "price", width: 15 },
    { header: "Subtotal", key: "subtotal", width: 15 },
    { header: "Total Purchase", key: "total", width: 18 },
  ];

  worksheet.getRow(1).font = { bold: true };

  let currentRow = 2;
  let grandTotal = 0;

  purchases.forEach((purchase) => {
    const startRow = currentRow;
    grandTotal += Number(purchase.totalAmount || 0);

    purchase.purchaseDetail.forEach((detail) => {
      worksheet.addRow({
        purchaseId: purchase.id,
        date: purchase.date,
        kasir: purchase.user?.name,
        supplier: purchase.supplier?.name,
        product: detail.product?.name,
        qty: detail.quantity,
        price: Number(detail.unitPrice),
        subtotal: Number(detail.subtotal),
        total: Number(purchase.totalAmount),
      });
      currentRow++;
    });

    const endRow = currentRow - 1;

    if (startRow < endRow) {
      ["A", "B", "C", "D", "I"].forEach((col) => {
        worksheet.mergeCells(`${col}${startRow}:${col}${endRow}`);
        worksheet.getCell(`${col}${startRow}`).alignment = {
          vertical: "middle",
          horizontal: "center",
        };
      });
    }
  });

  // =========================
  // GRAND TOTAL
  // =========================
  const totalRow = worksheet.addRow({
    supplier: "GRAND TOTAL",
    total: grandTotal,
  });
  totalRow.font = { bold: true };

  // =========================
  // FORMAT
  // =========================
  ["price", "subtotal", "total"].forEach((key) => {
    worksheet.getColumn(key).numFmt = '"Rp" #,##0';
  });
  worksheet.getColumn("date").numFmt = "dd-mm-yyyy hh:mm:ss";

  worksheet.eachRow((row) =>
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    })
  );

  // =========================
  // RESPONSE
  // =========================
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=purchase_report_${formatDDMMYY(
      startDate
    )}_to_${formatDDMMYY(endDate)}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
});
