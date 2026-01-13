import { asyncHandler } from "../utils/asyncHandler.js";
import { Supplier } from "../models/index.js";
import { Success, Error } from "../utils/response.js";

export const GetAllSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await Supplier.findAll();
  return Success(res, 200, "Suppliers retrieved successfully", suppliers);
});

export const GetSupplierById = asyncHandler(async (req, res) => {
  const supplierId = req.params.id;
  const supplier = await Supplier.findByPk(supplierId);
  if (!supplier) {
    return Error(res, 404, "Supplier not found");
  }
  return Success(res, 200, "Supplier retrieved successfully", supplier);
});

export const CreateSupplier = asyncHandler(async (req, res) => {
  const { name, phoneNumber, address } = req.body;
  const newSupplier = await Supplier.create({ name, phoneNumber, address });
  return Success(res, 201, "Supplier created successfully", newSupplier);
});

export const UpdateSupplier = asyncHandler(async (req, res) => {
  const supplierId = req.params.id;
  const { name, phoneNumber, address } = req.body;
  const supplier = await Supplier.findByPk(supplierId);
  if (!supplier) {
    return Error(res, 404, "Supplier not found");
  }
  await supplier.update({ name, phoneNumber, address });
  return Success(res, 200, { supplier });
});

export const DeleteSupplier = asyncHandler(async (req, res) => {
  const supplierId = req.params.id;
  const supplier = await Supplier.findByPk(supplierId);
  if (!supplier) {
    return Error(res, 404, "Supplier not found");
  }
  await supplier.destroy();
  return Success(res, 200, "Supplier deleted successfully");
});
