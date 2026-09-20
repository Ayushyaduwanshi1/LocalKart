const express = require('express');
const router = express.Router();
const {
  getDeliveries,
  getDeliveryById,
  assignDelivery,
  updateDeliveryStatus,
} = require('../controllers/deliveryController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/', authorize('ADMIN', 'STAFF', 'DELIVERY'), getDeliveries);
router.get('/:id', authorize('ADMIN', 'STAFF', 'DELIVERY'), getDeliveryById);
router.post('/:id/assign', authorize('ADMIN', 'STAFF'), assignDelivery);
router.patch('/:id/status', authorize('ADMIN', 'STAFF', 'DELIVERY'), updateDeliveryStatus);

module.exports = router;
