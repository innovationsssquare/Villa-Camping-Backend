const express = require("express");
const { body } = require("express-validator");
const {
  createCategory,
  updateCategory,
  getAllCategories,
  getSingleCategory,
  deleteCategory,
  getCategoryBySlug 
} = require("../Controller/Category");

const CategoryRouter = express.Router();

// Create a new category
CategoryRouter.post(
  "/create/category",
  body("name").notEmpty().withMessage("Category name is required"),
  createCategory
);

// Update an existing category
CategoryRouter.put(
  "/update/category/:id",
  body("name").notEmpty().withMessage("Category name is required"),
  updateCategory
);

// Get all categories
CategoryRouter.get("/get/categories", getAllCategories);

// Get a single category by ID
CategoryRouter.get("/get/category/:id", getSingleCategory);

CategoryRouter.get("/get/categorybyslug/:slug", getCategoryBySlug);

// Delete a category by ID
CategoryRouter.delete("/delete/category/:id", deleteCategory);

module.exports = { CategoryRouter };
