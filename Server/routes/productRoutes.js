const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// Helper to generate slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove non-word characters
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with dashes
    .replace(/^-+|-+$/g, ''); // Trim dashes
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category && category !== 'All Products') {
      // Direct comparison or regex comparison for flexibility
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get single product by slug
// @route   GET /api/products/:slug
// @access  Public
router.get('/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private (Admin)
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, basePrice, originalPrice, images, category, variants, inStock, freeDelivery } = req.body;

    if (!title || !basePrice || !category) {
      return res.status(400).json({ message: 'Please provide title, basePrice, and category' });
    }

    let slug = generateSlug(title);
    // Check if slug already exists and append random numbers if it does
    const existing = await Product.findOne({ slug });
    if (existing) {
      slug = `${slug}-${Math.floor(Math.random() * 10000)}`;
    }

    const product = new Product({
      title,
      slug,
      description,
      basePrice,
      originalPrice,
      images: images || [],
      category,
      variants: variants || [],
      inStock: inStock !== undefined ? inStock : true,
      freeDelivery: freeDelivery !== undefined ? freeDelivery : false,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (Admin)
router.put('/:id', protect, async (req, res) => {
  try {
    const { title, description, basePrice, originalPrice, images, category, variants, inStock, freeDelivery } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.title = title || product.title;
    if (title && title !== product.title) {
      let newSlug = generateSlug(title);
      const existing = await Product.findOne({ slug: newSlug });
      if (existing && existing._id.toString() !== product._id.toString()) {
        product.slug = `${newSlug}-${Math.floor(Math.random() * 10000)}`;
      } else {
        product.slug = newSlug;
      }
    }
    product.description = description !== undefined ? description : product.description;
    product.basePrice = basePrice !== undefined ? basePrice : product.basePrice;
    product.originalPrice = originalPrice !== undefined ? originalPrice : product.originalPrice;
    product.images = images || product.images;
    product.category = category || product.category;
    product.variants = variants || product.variants;
    product.inStock = inStock !== undefined ? inStock : product.inStock;
    product.freeDelivery = freeDelivery !== undefined ? freeDelivery : product.freeDelivery;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    await Product.deleteOne({ _id: req.params.id });
    res.json({ message: 'Product removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Seed sample products
// @route   POST /api/products/seed
// @access  Public
router.post('/seed', async (req, res) => {
  try {
    const count = await Product.countDocuments();
    if (count > 0) {
      return res.status(400).json({ message: 'Database is already seeded' });
    }

    const sampleProducts = [
      {
        title: "Premium Haribhanga & Amropali Combo (5 Kg)",
        slug: "haribhanga-amropali-combo-5kg",
        description: "Harvested fresh from Rajshahi. Combination of sweet, fiberless Haribhanga and juicy, fragrant Amropali mangoes.",
        basePrice: 750,
        originalPrice: 890,
        images: ["https://images.unsplash.com/photo-1553279768-865429fa0078?w=500"],
        category: "Combo Package",
        inStock: true,
        freeDelivery: true,
        variants: [
          { label: "5 Kg Package", price: 750 },
          { label: "10 Kg Package", price: 1450 }
        ]
      },
      {
        title: "Rajshahi Fazli Mango Premium (10 Kg)",
        slug: "rajshahi-fazli-10kg",
        description: "Huge-sized, sweet Fazli mangoes straight from the tree. Safe and naturally ripened.",
        basePrice: 1250,
        originalPrice: 1450,
        images: ["https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=500"],
        category: "Mango (আম)",
        inStock: true,
        freeDelivery: false,
        variants: [
          { label: "10 Kg Package", price: 1250 },
          { label: "20 Kg Package", price: 2400 }
        ]
      },
      {
        title: "Premium Medjool Dates (1 Kg Box)",
        slug: "medjool-dates-1kg",
        description: "Rich, soft, and extra-sweet imported Medjool dates. Great for daily energy.",
        basePrice: 850,
        originalPrice: 950,
        images: ["https://images.unsplash.com/photo-1569870499742-763d0974da37?w=500"],
        category: "Dates (খেজুর)",
        inStock: true,
        freeDelivery: false,
        variants: [
          { label: "1 Kg Box", price: 850 },
          { label: "2 Kg Package", price: 1650 }
        ]
      },
      {
        title: "Homemade Sweet & Sour Mango Pickle",
        slug: "mango-pickle-400g",
        description: "Prepared in mustard oil with aromatic spices. No preservatives added. Net weight: 400g.",
        basePrice: 280,
        originalPrice: 320,
        images: ["https://images.unsplash.com/photo-1589135233689-d91d9cc7d8ff?w=500"],
        category: "Pickle (আচার)",
        inStock: true,
        freeDelivery: false,
        variants: [
          { label: "400g Jar", price: 280 },
          { label: "1 Kg Premium Jar", price: 650 }
        ]
      },
      {
        title: "Premium Khurma Dates (1 Kg)",
        slug: "khurma-dates-1kg",
        description: "High quality Khurma dates, rich in iron and nutrients. Handpacked under strict hygiene standards.",
        basePrice: 450,
        originalPrice: 550,
        images: ["https://images.unsplash.com/photo-1569870499742-763d0974da37?w=500"],
        category: "Dates (খেজুর)",
        inStock: true,
        freeDelivery: false,
        variants: [
          { label: "1 Kg Package", price: 450 },
          { label: "2 Kg Package", price: 880 }
        ]
      },
      {
        title: "Himsagar Mango Rajshahi (5 Kg)",
        slug: "himsagar-mango-5kg",
        description: "The king of mangoes - Himsagar. Known for its pleasant aroma, sweet taste, and fiberless pulp.",
        basePrice: 650,
        originalPrice: 750,
        images: ["https://images.unsplash.com/photo-1553279768-865429fa0078?w=500"],
        category: "Mango (আম)",
        inStock: true,
        freeDelivery: false,
        variants: [
          { label: "5 Kg Package", price: 650 },
          { label: "10 Kg Package", price: 1250 }
        ]
      }
    ];

    const seeded = await Product.insertMany(sampleProducts);
    res.status(201).json(seeded);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
