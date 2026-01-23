import {
  Sale,
  SaleDetail,
  Product,
  Category,
  User,
  sequelize,
  Sequelize,
} from "../models/index.js";
const { fn, col, literal } = Sequelize;
import ExcelJS from "exceljs";
import user from "../models/user.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Success, Error } from "../utils/response.js";
import { Op } from "sequelize";

export const getAllSales = asyncHandler(async (req, res) => {
  const sales = await Sale.findAll({
    include: [
      {
        model: SaleDetail,
        as: "saleDetail",
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "sellingPrice"],
          },
        ],
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"],
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
        as: "saleDetail",
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "sellingPrice"],
          },
        ],
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"],
      },
    ],
  });

  if (!sale) {
    return Error(res, 404, "Sale not found");
  }

  return Success(res, 200, "Sale retrieved successfully", sale);
});

export const getSaleByCurrentUserAndDate = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate } = req.query;

  if (!userId) {
    return Error(res, 400, "User unauthenticated");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setDate(end.getDate() + 1); // +1 hari

  const sales = await Sale.findAll({
    where: {
      userId,
      date: {
        [Op.between]: [start, end],
      },
    },
    include: [
      {
        model: SaleDetail,
        as: "saleDetail",
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "sellingPrice"],
          },
        ],
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"],
      },
    ],
  });

  return Success(res, 200, "Sales retrieved successfully", sales);
});

export const createSale = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { items } = req.body;

  if (!userId) return Error(res, 400, "User unauthenticated");
  if (!Array.isArray(items) || items.length === 0)
    return Error(res, 400, "Items are required");

  const t = await sequelize.transaction();

  try {
    let totalPrice = 0;

    const sale = await Sale.create(
      { userId, totalPrice: 0 },
      { transaction: t }
    );

    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);

      if (!productId || !quantity) {
        return Error("Each item must have productId and quantity");
      }

      const product = await Product.findByPk(productId, { transaction: t });
      if (!product) {
        return Error(`Product with ID ${productId} not found`);
      }

      // if (product.stock < quantity) {
      //   return Error(`Insufficient stock for product ${product.name}`);
      // }

      const unitPrice = Number(product.sellingPrice);
      const unitCost = Number(product.purchasePrice);
      const subtotal = unitPrice * quantity;
      totalPrice += subtotal;

      await SaleDetail.create(
        {
          saleId: sale.id,
          productId,
          quantity,
          unitPrice,
          unitCost,
          subtotal,
        },
        { transaction: t }
      );

      await Product.decrement(
        { stock: quantity },
        { where: { id: productId }, transaction: t }
      );
    }

    await sale.update({ totalPrice }, { transaction: t });
    await t.commit();

    return Success(res, 201, "Sale created successfully");
  } catch (error) {
    await t.rollback();
    return Error(res, 500, error.message);
  }
});

export const voidSale = asyncHandler(async (req, res) => {
  const saleId = req.params.id;

  if (!saleId) {
    return Error(res, 400, "Sale ID is required");
  }
  const sale = await Sale.findByPk(saleId, {
    include: [
      {
        model: SaleDetail,
        as: "saleDetail",
        include: [{ model: Product, as: "product" }],
      },
    ],
  });
  if (!sale) {
    return Error(res, 404, "Sale not found");
  }

  const t = await sequelize.transaction();
  try {
    // Rollback stock (atomic increment)
    for (const detail of sale.saleDetail) {
      await Product.increment(
        { stock: detail.quantity },
        { where: { id: detail.product.id }, transaction: t }
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

export const getSalesByDate = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return Error(res, 400, "startDate and endDate are required");
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setDate(end.getDate() + 1); // +1 hari

  const sales = await Sale.findAll({
    where: {
      date: {
        [Op.between]: [start, end],
      },
    },
    include: [
      {
        model: SaleDetail,
        as: "saleDetail", // ✅ HARUS sama persis
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "sellingPrice"],
          },
        ],
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"],
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
    include: [{ model: SaleDetail, as: "saleDetail" }],
  });

  if (!sale) {
    return Error(res, 404, "Sale not found");
  }

  await sequelize.transaction(async (t) => {
    /** 1️⃣ Rollback stok lama */
    for (const detail of sale.saleDetail) {
      await Product.increment(
        { stock: detail.quantity },
        { where: { id: detail.productId }, transaction: t }
      );
    }

    /** 2️⃣ Hapus detail lama */
    await SaleDetail.destroy({ where: { saleId } }, { transaction: t });

    let totalPrice = 0;

    /** 3️⃣ Simpan item baru */
    for (const item of items) {
      const { productId, quantity } = item;

      if (!productId || !quantity) {
        return Error(res, 400, "Each item must have productId and quantity");
      }

      const product = await Product.findByPk(productId, { transaction: t });
      if (!product) {
        return Error(`Product with ID ${productId} not found`);
      }

      if (product.stock < quantity) {
        return Error(
          `Insufficient stock for product ${product.name}. Available: ${product.stock}`
        );
      }

      const unitPrice = product.sellingPrice;
      const unitCost = product.purchasePrice;
      const subtotal = unitPrice * quantity;
      totalPrice += subtotal;

      await SaleDetail.create(
        {
          saleId,
          productId,
          quantity,
          unitPrice,
          unitCost,
          subtotal,
        },
        { transaction: t }
      );

      /** 4️⃣ Kurangi stok */
      await Product.decrement(
        { stock: quantity },
        { where: { id: productId }, transaction: t }
      );
    }

    /** 5️⃣ Update total sale */
    await sale.update({ totalPrice }, { transaction: t });
  });

  return Success(res, 200, "Sale updated successfully");
});

export const exportSalesReportXlsx = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return Error(res, 400, "startDate and endDate are required");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const formatDDMMYY = (date) => {
    const d = new Date(date);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  };

  const sales = await Sale.findAll({
    where: {
      date: {
        [Op.between]: [start, end],
      },
    },
    include: [
      {
        model: SaleDetail,
        as: "saleDetail", // Tambahkan alias agar konsisten
        include: [{ model: Product, as: "product", attributes: ["name"] }],
      },
      { model: User, as: "user", attributes: ["name"] },
    ],
    order: [["date", "ASC"]],
  });

  // =========================
  // CREATE EXCEL
  // =========================
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sales Report");

  worksheet.columns = [
    { header: "Sale ID", key: "saleId", width: 10 },
    { header: "Tanggal", key: "date", width: 20 },
    { header: "User", key: "user", width: 15 },
    { header: "Produk", key: "product", width: 35 },
    { header: "Qty", key: "qty", width: 8 },
    { header: "Harga", key: "price", width: 15 },
    { header: "Subtotal", key: "subtotal", width: 15 },
    { header: "Total Sale", key: "total", width: 15 },
  ];

  worksheet.getRow(1).font = { bold: true };

  // =========================
  // DATA
  // =========================
  let currentRow = 2;
  let grandTotalSales = 0;

  sales.forEach((sale) => {
    grandTotalSales += Number(sale.totalPrice);
    const startRow = currentRow;

    sale.saleDetail.forEach((detail) => {
      worksheet.addRow({
        saleId: sale.id,
        date: sale.date,
        user: sale.user?.name,
        product: detail.product?.name,
        qty: detail.quantity,
        price: Number(detail.unitPrice),
        subtotal: Number(detail.subtotal),
        total: Number(sale.totalPrice),
      });
      currentRow++;
    });

    const endRow = currentRow - 1;

    if (startRow < endRow) {
      worksheet.mergeCells(`A${startRow}:A${endRow}`);
      worksheet.mergeCells(`B${startRow}:B${endRow}`);
      worksheet.mergeCells(`C${startRow}:C${endRow}`);
      worksheet.mergeCells(`H${startRow}:H${endRow}`);
    }

    ["A", "B", "C", "H"].forEach((col) => {
      worksheet.getCell(`${col}${startRow}`).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    });
  });

  // =========================
  // GRAND TOTAL (ANGKA SAJA)
  // =========================
  const totalRow = worksheet.addRow({
    total: grandTotalSales,
  });
  totalRow.font = { bold: true };

  // =========================
  // FORMAT
  // =========================
  worksheet.getColumn("price").numFmt = '"Rp" #,##0';
  worksheet.getColumn("subtotal").numFmt = '"Rp" #,##0';
  worksheet.getColumn("total").numFmt = '"Rp" #,##0';
  worksheet.getColumn("date").numFmt = "dd-mm-yyyy hh:mm:ss";

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  // =========================
  // RESPONSE
  // =========================
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=sales_report_${formatDDMMYY(
      startDate
    )}_to_${formatDDMMYY(endDate)}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
});

export const getSaleByCashierAndDate = asyncHandler(async (req, res) => {
  const cashierId = req.params.cashierId;
  const { startDate, endDate } = req.query;
  if (!cashierId) {
    return Error(res, 400, "cashierId is required");
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setDate(end.getDate() + 1); // +1 hari
  const sales = await Sale.findAll({
    where: {
      userId: cashierId,
      date: {
        [Op.between]: [start, end],
      },
    },
    include: [
      {
        model: SaleDetail,
        as: "saleDetail",
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name", "sellingPrice"],
          },
        ],
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"],
      },
    ],
  });
  return Success(res, 200, "Sales retrieved successfully", sales);
});

export const getProfitByDate = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return Error(res, 400, "startDate and endDate are required");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setDate(end.getDate() + 1);

  const result = await SaleDetail.findAll({
    attributes: [
      [fn("DATE", col("sale.date")), "date"],
      [fn("SUM", literal("unitPrice * quantity")), "totalSale"],
      [fn("SUM", literal("unitCost * quantity")), "totalHpp"],
      [fn("SUM", literal("(unitPrice - unitCost) * quantity")), "profit"],
    ],
    include: [
      {
        model: Sale,
        as: "sale", // <-- Tambahkan alias sesuai relasi
        attributes: [],
        where: {
          date: {
            [Op.between]: [start, end],
          },
        },
      },
    ],
    group: [fn("DATE", col("sale.date"))],
    order: [[fn("DATE", col("sale.date")), "ASC"]],
    raw: true,
  });

  const formatted = result.map((row) => {
    const totalSale = Number(row.totalSale);
    const profit = Number(row.profit);
    return {
      date: row.date,
      totalSale,
      totalHpp: Number(row.totalHpp),
      profit,
      margin:
        totalSale > 0 ? Number(((profit / totalSale) * 100).toFixed(2)) : 0,
    };
  });

  return Success(res, 200, "Profit by date calculated successfully", formatted);
});

export const getProfitPerProduct = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return Error(res, 400, "startDate and endDate are required");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setDate(end.getDate() + 1);

  const result = await SaleDetail.findAll({
    attributes: [
      "productId",
      [col("product.name"), "productName"],
      [fn("SUM", col("quantity")), "qtySold"],
      [fn("SUM", literal("unitPrice * quantity")), "totalSale"],
      [fn("SUM", literal("unitCost * quantity")), "totalHpp"],
      [fn("SUM", literal("(unitPrice - unitCost) * quantity")), "profit"],
    ],
    include: [
      {
        model: Sale,
        as: "sale", // <-- Tambahkan alias sesuai relasi
        attributes: [],
        where: {
          date: {
            [Op.between]: [start, end],
          },
        },
      },
      {
        model: Product,
        as: "product", // <-- Tambahkan alias sesuai relasi
        attributes: [],
      },
    ],
    group: ["productId", "product.name"],
    order: [[literal("profit"), "DESC"]],
    raw: true,
  });

  const formatted = result.map((row) => {
    const totalSale = Number(row.totalSale);
    const profit = Number(row.profit);
    return {
      productId: row.productId,
      productName: row.productName,
      qtySold: Number(row.qtySold),
      totalSale,
      totalHpp: Number(row.totalHpp),
      profit,
      margin:
        totalSale > 0 ? Number(((profit / totalSale) * 100).toFixed(2)) : 0,
    };
  });

  return Success(
    res,
    200,
    "Profit per product calculated successfully",
    formatted
  );
});
