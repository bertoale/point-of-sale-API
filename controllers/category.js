import { asyncHandler } from "../utils/asyncHandler.js";
import { Category } from "../models/index.js";
import { Success, Error } from "../utils/response.js";

export const GetAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.findAll();
  return Success(res, 200, { categories });
});

export const GetCategoryById = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;
  const category = await Category.findByPk(categoryId);
  if (!category) {
    return Error(res, 404, "Category not found");
  }
  return Success(res, 200, { category });
});

export const CreateCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const newCategory = await Category.create({ name });
  return Success(res, 201, { category: newCategory });
});

export const UpdateCategory = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;
  const { name } = req.body;
  const category = await Category.findByPk(categoryId);
  if (!category) {
    return Error(res, 404, "Category not found");
  }
  await category.update({ name });
  return Success(res, 200, { category });
});

export const DeleteCategory = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;
  const category = await Category.findByPk(categoryId);
  if (!category) {
    return Error(res, 404, "Category not found");
  }
  await category.destroy();
  return Success(res, 200, { message: "Category deleted successfully" });
});
