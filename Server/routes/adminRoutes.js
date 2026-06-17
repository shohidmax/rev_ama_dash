const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/auth');

// Helper to generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'amaira_secret_key_123', {
    expiresIn: '30d',
  });
};

// Helper to seed first admin if none exists
const ensureAdminExists = async () => {
  const adminCount = await Admin.countDocuments();
  if (adminCount === 0) {
    const defaultUser = process.env.ADMIN_USERNAME || 'admin';
    const defaultPass = process.env.ADMIN_PASSWORD || 'amaira12345';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPass, salt);
    
    await Admin.create({
      username: defaultUser,
      password: hashedPassword
    });
    console.log(`Default admin seeded successfully! Username: ${defaultUser}`);
  }
};

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }

    // Proactively seed admin if it's the first time
    await ensureAdminExists();

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({
      token: generateToken(admin._id),
      username: admin.username
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Verify active admin token
// @route   GET /api/admin/verify
// @access  Private (Admin)
router.get('/verify', protect, async (req, res) => {
  try {
    res.json({ valid: true, username: req.adminEmail });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// @desc    Get all customers details
// @route   GET /api/admin/customers
// @access  Private (Admin)
router.get('/customers', protect, async (req, res) => {
  try {
    const UserDetail = require('../models/UserDetail');
    const customers = await UserDetail.find({}).populate('wishlist', 'title basePrice images slug');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update customer profile details (block/unblock, edit points, edit notes)
// @route   PATCH /api/admin/customers/:id
// @access  Private (Admin)
router.patch('/customers/:id', protect, async (req, res) => {
  try {
    const UserDetail = require('../models/UserDetail');
    const { isBlocked, loyaltyPoints, notes } = req.body;
    const customer = await UserDetail.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    if (isBlocked !== undefined) customer.isBlocked = isBlocked;
    if (loyaltyPoints !== undefined) customer.loyaltyPoints = loyaltyPoints;
    if (notes !== undefined) customer.notes = notes;

    await customer.save();
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all support tickets
// @route   GET /api/admin/tickets
// @access  Private (Admin)
router.get('/tickets', protect, async (req, res) => {
  try {
    const UserDetail = require('../models/UserDetail');
    const users = await UserDetail.find({}, 'customerUID phone tickets');
    let allTickets = [];
    users.forEach(user => {
      if (user.tickets && user.tickets.length > 0) {
        user.tickets.forEach(ticket => {
          allTickets.push({
            userMongoId: user._id,
            customerUID: user.customerUID,
            phone: user.phone,
            id: ticket.id,
            subject: ticket.subject,
            description: ticket.description,
            status: ticket.status,
            reply: ticket.reply || '',
            repliedAt: ticket.repliedAt,
            createdAt: ticket.createdAt
          });
        });
      }
    });
    // Sort tickets chronologically descending
    allTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(allTickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update a support ticket status or add a reply
// @route   PATCH /api/admin/tickets/:userId/:ticketId
// @access  Private (Admin)
router.patch('/tickets/:userId/:ticketId', protect, async (req, res) => {
  try {
    const UserDetail = require('../models/UserDetail');
    const { status, reply } = req.body;
    const user = await UserDetail.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const ticket = user.tickets.find(t => t.id === req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (status) ticket.status = status;
    if (reply !== undefined) {
      ticket.reply = reply;
      ticket.repliedAt = new Date();
      
      // Also inject a notification into user's profile to let them know of the reply
      user.notifications.push({
        id: 'reply_' + Date.now(),
        title: 'Support Ticket Update',
        body: `Our support team has responded to your ticket "${ticket.subject}": "${reply}"`,
        read: false
      });
    }

    await user.save();
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
