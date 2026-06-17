const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderID: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  }, // Short code like AM-18392
  customerName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  district: { type: String, required: true, trim: true }, // BD Districts, e.g. "Dhaka", "Rajshahi"
  shippingAddress: { type: String, required: true, trim: true },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productTitle: { type: String, required: true }, // Snapshot in case product title changes
  variant: { type: String, required: true }, // Snapshot of selected variant
  quantity: { type: Number, required: true, min: 1 },
  totalAmount: { type: Number, required: true },
  shippingFee: { type: Number, required: true },
  paymentMethod: { type: String, default: 'COD' }, // Cash On Delivery
  orderStatus: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  customerUID: { type: String, index: true }, // References Firebase Auth UID if logged in
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
