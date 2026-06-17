const express = require('express');
const router = express.Router();
const UserDetail = require('../models/UserDetail');
const { protect } = require('../middleware/auth');

// @desc    Get or initialize user profile details
// @route   GET /api/user/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    let profile = await UserDetail.findOne({ customerUID: req.adminId })
      .populate('wishlist', 'title images slug basePrice originalPrice category inStock');
    
    if (!profile) {
      // Create default profile for new user
      profile = new UserDetail({
        customerUID: req.adminId,
        // Populate standard initial welcome notification
        notifications: [{
          id: 'welcome_' + Date.now(),
          title: 'Welcome to Amaira Fruits!',
          body: 'Thanks for creating an account with us. Enjoy 150 welcome loyalty points in your wallet!',
          read: false
        }]
      });
      await profile.save();
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update basic user profile details
// @route   POST /api/user/profile
// @access  Private
router.post('/profile', protect, async (req, res) => {
  try {
    const { dob, gender, phone, avatar } = req.body;
    let profile = await UserDetail.findOne({ customerUID: req.adminId });

    if (!profile) {
      profile = new UserDetail({ customerUID: req.adminId });
    }

    if (dob !== undefined) profile.dob = dob;
    if (gender !== undefined) profile.gender = gender;
    if (phone !== undefined) profile.phone = phone;
    if (avatar !== undefined) profile.avatar = avatar;

    await profile.save();
    
    // Populate wishlist for return
    await profile.populate('wishlist', 'title images slug basePrice originalPrice category inStock');
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Add or update address
// @route   POST /api/user/addresses
// @access  Private
router.post('/addresses', protect, async (req, res) => {
  try {
    const { id, label, customerName, phone, district, shippingAddress, isDefault } = req.body;
    if (!customerName || !phone || !district || !shippingAddress) {
      return res.status(400).json({ message: 'All address fields are required' });
    }

    let profile = await UserDetail.findOne({ customerUID: req.adminId });
    if (!profile) {
      profile = new UserDetail({ customerUID: req.adminId });
    }

    // If setting default, unset other defaults
    if (isDefault) {
      profile.addresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    const targetId = id || 'addr_' + Date.now();
    const existingIndex = profile.addresses.findIndex(addr => addr.id === targetId);

    const addressData = {
      id: targetId,
      label: label || 'Home',
      customerName,
      phone,
      district,
      shippingAddress,
      isDefault: isDefault || (profile.addresses.length === 0) // default if first
    };

    if (existingIndex > -1) {
      profile.addresses[existingIndex] = addressData;
    } else {
      profile.addresses.push(addressData);
    }

    await profile.save();
    await profile.populate('wishlist', 'title images slug basePrice originalPrice category inStock');
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete an address
// @route   DELETE /api/user/addresses/:id
// @access  Private
router.delete('/addresses/:id', protect, async (req, res) => {
  try {
    let profile = await UserDetail.findOne({ customerUID: req.adminId });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const initialLength = profile.addresses.length;
    profile.addresses = profile.addresses.filter(addr => addr.id !== req.params.id);

    if (profile.addresses.length === initialLength) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // If we deleted default, set another default
    const hasDefault = profile.addresses.some(addr => addr.isDefault);
    if (!hasDefault && profile.addresses.length > 0) {
      profile.addresses[0].isDefault = true;
    }

    await profile.save();
    await profile.populate('wishlist', 'title images slug basePrice originalPrice category inStock');
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Toggle item in wishlist
// @route   POST /api/user/wishlist
// @access  Private
router.post('/wishlist', protect, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    let profile = await UserDetail.findOne({ customerUID: req.adminId });
    if (!profile) {
      profile = new UserDetail({ customerUID: req.adminId });
    }

    const index = profile.wishlist.indexOf(productId);
    if (index > -1) {
      profile.wishlist.splice(index, 1); // remove
    } else {
      profile.wishlist.push(productId); // add
    }

    await profile.save();
    await profile.populate('wishlist', 'title images slug basePrice originalPrice category inStock');
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a support ticket
// @route   POST /api/user/tickets
// @access  Private
router.post('/tickets', protect, async (req, res) => {
  try {
    const { subject, description } = req.body;
    if (!subject || !description) {
      return res.status(400).json({ message: 'Subject and description are required' });
    }

    let profile = await UserDetail.findOne({ customerUID: req.adminId });
    if (!profile) {
      profile = new UserDetail({ customerUID: req.adminId });
    }

    const ticketId = 'TK-' + Math.floor(10000 + Math.random() * 90000);
    profile.tickets.push({
      id: ticketId,
      subject,
      description,
      status: 'Open'
    });

    await profile.save();
    await profile.populate('wishlist', 'title images slug basePrice originalPrice category inStock');
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Mark notifications as read
// @route   POST /api/user/notifications/read
// @access  Private
router.post('/notifications/read', protect, async (req, res) => {
  try {
    const { id } = req.body;
    let profile = await UserDetail.findOne({ customerUID: req.adminId });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    if (id) {
      const idx = profile.notifications.findIndex(n => n.id === id);
      if (idx > -1) {
        profile.notifications[idx].read = true;
      }
    } else {
      // Mark all as read
      profile.notifications.forEach(n => {
        n.read = true;
      });
    }

    await profile.save();
    await profile.populate('wishlist', 'title images slug basePrice originalPrice category inStock');
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update notification settings
// @route   POST /api/user/notifications/settings
// @access  Private
router.post('/notifications/settings', protect, async (req, res) => {
  try {
    const { email, sms, push } = req.body;
    let profile = await UserDetail.findOne({ customerUID: req.adminId });
    if (!profile) {
      profile = new UserDetail({ customerUID: req.adminId });
    }

    if (email !== undefined) profile.notificationSettings.email = email;
    if (sms !== undefined) profile.notificationSettings.sms = sms;
    if (push !== undefined) profile.notificationSettings.push = push;

    await profile.save();
    await profile.populate('wishlist', 'title images slug basePrice originalPrice category inStock');
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
