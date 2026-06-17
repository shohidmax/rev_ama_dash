const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// Helper to generate unique human-readable tracking ID
const generateTrackingID = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let trackingID = '';

  while (!isUnique) {
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    trackingID = `AM-${result}`;
    
    const existing = await Order.findOne({ orderID: trackingID });
    if (!existing) {
      isUnique = true;
    }
  }

  return trackingID;
};

// @desc    Place a new order
// @route   POST /api/orders
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { 
      customerName, 
      phone, 
      district, 
      shippingAddress, 
      productId, 
      variant, 
      quantity, 
      paymentMethod,
      customerUID
    } = req.body;

    if (!customerName || !phone || !district || !shippingAddress || !productId || !variant || !quantity) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Determine price of the variant
    let itemPrice = product.basePrice;
    const selectedVariant = product.variants.find(v => v.label === variant);
    if (selectedVariant) {
      itemPrice = selectedVariant.price;
    }

    // Determine shipping fee based on district
    // e.g. Dhaka: 80, Others: 150. If product specifies free delivery, it's 0.
    let shippingFee = 150;
    if (product.freeDelivery) {
      shippingFee = 0;
    } else {
      const isDhaka = district.toLowerCase().includes('dhaka');
      shippingFee = isDhaka ? 80 : 150;
    }

    const totalAmount = (itemPrice * quantity) + shippingFee;

    const orderID = await generateTrackingID();

    const order = new Order({
      orderID,
      customerName,
      phone,
      district,
      shippingAddress,
      product: productId,
      productTitle: product.title,
      variant,
      quantity,
      totalAmount,
      shippingFee,
      paymentMethod: paymentMethod || 'COD',
      orderStatus: 'Pending',
      customerUID: customerUID || undefined
    });

    const savedOrder = await order.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Track order by OrderID or Phone
// @route   GET /api/orders/track/:query
// @access  Public
router.get('/track/:query', async (req, res) => {
  try {
    const queryStr = req.params.query.trim();
    // Allow tracking by OrderID (e.g. AM-XXXXX) or exact Phone number
    const orders = await Order.find({
      $or: [
        { orderID: { $regex: new RegExp(`^${queryStr}$`, 'i') } },
        { phone: queryStr }
      ]
    }).populate('product', 'title images slug').sort({ createdAt: -1 });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: 'No orders found matching the tracking details' });
    }

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private (Admin)
router.get('/', protect, async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('product', 'title images slug')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private (Admin)
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.orderStatus = status;
    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get logged in customer's order history
// @route   GET /api/orders/my-orders
// @access  Private (Customer)
router.get('/my-orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ customerUID: req.adminId })
      .populate('product', 'title images slug')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
