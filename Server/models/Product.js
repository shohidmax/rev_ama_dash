const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  label: { type: String, required: true }, // e.g., "5 Kg Package", "10 Kg Package"
  price: { type: Number, required: true },
});

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  description: { type: String },
  basePrice: { type: Number, required: true },
  originalPrice: { type: Number }, // For strikethrough/discounted price
  images: [{ type: String }], // Array of imgbb URLs
  category: { type: String, required: true, trim: true }, // e.g., "Mango", "Pickle", "Dates", "Combo"
  variants: [variantSchema],
  inStock: { type: Boolean, default: true },
  freeDelivery: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);
