import { asyncHandler } from "../utils/asyncHandler.js";
import { Product } from "../models/index.js";
import { Success, Error } from "../utils/response.js";

export const GetAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.findAll();
  return Success(res, 200, { products });
});

export const GetProductById = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const product = await Product.findByPk(productId);
  if (!product) {
    return Error(res, 404, "Product not found");
  }
  return Success(res, 200, { product });
});

export const CreateProduct = asyncHandler(async (req, res) => {
  const { CategoryId, name, sellingPrice, purchasePrice, stock } = req.body;
  const newProduct = await Product.create({
    CategoryId,
    name,
    sellingPrice,
    purchasePrice,
    stock,
  });
  return Success(res, 201, { product: newProduct });
});

export const UpdateProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const { CategoryId, name, sellingPrice, purchasePrice, stock } = req.body;
  const product = await Product.findByPk(productId);
  if (!product) {
    return Error(res, 404, "Product not found");
  }
  await product.update({
    CategoryId,
    name,
    sellingPrice,
    purchasePrice,
    stock,
  });
  return Success(res, 200, { product });
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
