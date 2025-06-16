const { validationResult } = require("express-validator");
const AppErr = require("../Services/AppErr");
const Category = require("../Model/Categoryschema");

// Create a new category
const createCategory = async (req, res, next) => {
  try {
    // Validate input fields
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppErr("Validation failed", 400, errors.array()));
    }

    const { name, description, features, seasonalTrends, popularityScore,image } = req.body;

    // Check if category already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return next(new AppErr("Category already exists", 400));
    }

    // Create a new category document
    const category = new Category({
      name,
      description,
      features,
      seasonalTrends,
      popularityScore,
      image
    });

    // Save category to the database
    await category.save();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Error creating category", 500));
  }
};

// Update an existing category
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate input fields
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppErr("Validation failed", 400, errors.array()));
    }

    const updatedCategory = await Category.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedCategory) {
      return next(new AppErr("Category not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Error updating category", 500));
  }
};

// Get all categories
const getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find();
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Error fetching categories", 500));
  }
};

// Get a single category by ID
const getSingleCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return next(new AppErr("Category not found", 404));
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Error fetching category", 500));
  }
};

// Delete a category by ID (Soft Delete)
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedCategory = await Category.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true });

    if (!deletedCategory) {
      return next(new AppErr("Category not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      data: deletedCategory,
    });
  } catch (error) {
    console.error(error);
    next(new AppErr("Error deleting category", 500));
  }
};

module.exports = {
  createCategory,
  updateCategory,
  getAllCategories,
  getSingleCategory,
  deleteCategory,
};
