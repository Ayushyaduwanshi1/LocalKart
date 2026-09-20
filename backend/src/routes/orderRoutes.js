const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  trackOrder,
  getInvoice,
  deleteOrder,
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Public tracking route for customers
router.get('/track/:orderNumber', trackOrder);

router.use(protect);

router.get('/', getOrders);
router.post('/', createOrder);
router.get('/:id/invoice', getInvoice);
router.get('/:id', getOrderById);
router.patch('/:id/status', authorize('ADMIN', 'STAFF'), updateOrderStatus);
router.delete('/:id', authorize('ADMIN'), deleteOrder);

module.exports = router;
