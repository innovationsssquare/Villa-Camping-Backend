const { Cottages, Cottage } = require("../Models/Cottage");

// Create new cottage (parent + units)
exports.createCottage = async (req, res) => {
  try {
    const { propertyId, units } = req.body;

    const unitDocs = await Cottage.insertMany(
      units.map((unit) => ({ ...unit, property: propertyId }))
    );

    const cottageParent = await Cottages.create({
      property: propertyId,
      cottages: unitDocs.map((u) => u._id),
    });

    res.status(201).json({ message: "Cottage created", data: cottageParent });
  } catch (error) {
    res.status(500).json({ message: "Error creating cottage", error });
  }
};

// Get all cottage properties
exports.getAllCottages = async (req, res) => {
  try {
    const cottages = await Cottages.find({ deletedAt: null }).populate("cottages");
    res.status(200).json({ data: cottages });
  } catch (error) {
    res.status(500).json({ message: "Error fetching cottages", error });
  }
};

// Get one cottage property
exports.getCottageById = async (req, res) => {
  try {
    const cottage = await Cottages.findById(req.params.id).populate("cottages");
    if (!cottage) return res.status(404).json({ message: "Cottage not found" });
    res.status(200).json({ data: cottage });
  } catch (error) {
    res.status(500).json({ message: "Error fetching cottage", error });
  }
};

// Update a cottage unit
exports.updateCottageUnit = async (req, res) => {
  try {
    const updated = await Cottage.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Cottage unit not found" });
    res.status(200).json({ message: "Updated successfully", data: updated });
  } catch (error) {
    res.status(500).json({ message: "Error updating cottage unit", error });
  }
};

// Soft delete a cottage unit
exports.deleteCottageUnit = async (req, res) => {
  try {
    const deleted = await Cottage.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date() },
      { new: true }
    );
    if (!deleted) return res.status(404).json({ message: "Cottage unit not found" });
    res.status(200).json({ message: "Deleted successfully", data: deleted });
  } catch (error) {
    res.status(500).json({ message: "Error deleting cottage unit", error });
  }
};
