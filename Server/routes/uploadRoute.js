const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { protect } = require('../middleware/auth');

// Multer configuration: store in memory buffer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // limit to 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'), false);
    }
  }
});

// @desc    Upload image to imgbb
// @route   POST /api/upload
// @access  Private (Admin)
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: IMGBB_API_KEY is not defined in backend environment variables. Returning a local placeholder image instead.");
      // Fallback placeholder image so that development doesn't break
      return res.json({
        url: "https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=500"
      });
    }

    // Convert file buffer to base64
    const base64Image = req.file.buffer.toString('base64');

    // Prepare imgbb API request
    const form = new FormData();
    form.append('image', base64Image);

    const imgbbResponse = await axios.post(
      `https://api.imgbb.com/1/upload?key=${apiKey}`,
      form,
      {
        headers: form.getHeaders(),
      }
    );

    if (imgbbResponse.data && imgbbResponse.data.data && imgbbResponse.data.data.url) {
      res.json({ url: imgbbResponse.data.data.url });
    } else {
      res.status(500).json({ message: 'Failed to upload image to imgbb' });
    }
  } catch (error) {
    console.error('Upload error details:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Image upload failed', error: error.message });
  }
});

module.exports = router;
