const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  lookupProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', getProducts);
router.get('/categories', getCategories);
router.post('/categories', protect, authorize('ADMIN', 'STAFF'), createCategory);
router.get('/lookup/:code', protect, authorize('ADMIN', 'STAFF'), lookupProduct);
router.get('/:id', getProductById);
router.post('/', protect, authorize('ADMIN', 'STAFF'), createProduct);
router.put('/:id', protect, authorize('ADMIN', 'STAFF'), updateProduct);
router.delete('/:id', protect, authorize('ADMIN'), deleteProduct);

module.exports = router;
