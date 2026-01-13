import { asyncHandler } from "../utils/asyncHandler.js";
import { Product } from "../models/index.js";
import { Success, Error } from "../utils/response.js";

export const GetAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.findAll();
  return Success(res, 200, "Products retrieved successfully", { products });
});

export const GetProductById = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const product = await Product.findByPk(productId);
  if (!product) {
    return Error(res, 404, "Product not found");
  }
  return Success(res, 200, "Product retrieved successfully", { product });
});

export const CreateProduct = asyncHandler(async (req, res) => {
  const { categoryId, name, sellingPrice, purchasePrice, stock } = req.body;
  const newProduct = await Product.create({
    categoryId,
    name,
    sellingPrice,
    purchasePrice,
    stock,
  });
  return Success(res, 201, "Product created successfully", newProduct);
});

export const UpdateProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const { categoryId, name, sellingPrice, purchasePrice, stock } = req.body;
  const product = await Product.findByPk(productId);
  if (!product) {
    return Error(res, 404, "Product not found");
  }
  await product.update({
    categoryId,
    name,
    sellingPrice,
    purchasePrice,
    stock,
  });
  return Success(res, 200, "Product updated successfully", product);
});

export const DeleteProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const product = await Product.findByPk(productId);
  if (!product) {
    return Error(res, 404, "Product not found");
  }
  await product.destroy();
  return Success(res, 200, { message: "Product deleted successfully" });
});
