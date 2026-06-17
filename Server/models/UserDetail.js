const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, default: 'Home' }, // Home, Office, etc.
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  district: { type: String, required: true },
  shippingAddress: { type: String, required: true },
  isDefault: { type: Boolean, default: false }
});

const TicketSchema = new mongoose.Schema({
  id: { type: String, required: true },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, default: 'Open', enum: ['Open', 'In Progress', 'Resolved'] },
  reply: { type: String, default: '' },
  repliedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const NotificationSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const UserDetailSchema = new mongoose.Schema({
  customerUID: { type: String, required: true, unique: true, index: true },
  avatar: { type: String, default: '' },
  dob: { type: String, default: '' },
  gender: { type: String, default: '' },
  phone: { type: String, default: '' },
  loyaltyPoints: { type: Number, default: 150 },
  addresses: [AddressSchema],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  tickets: [TicketSchema],
  notifications: [NotificationSchema],
  notificationSettings: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    push: { type: Boolean, default: false }
  },
  isBlocked: { type: Boolean, default: false },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('UserDetail', UserDetailSchema);
