const express = require('express');
const router = express.Router();
const { getPayments, createPayment, getPaymentStats } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('ADMIN', 'STAFF'));

router.get('/stats', getPaymentStats);
router.get('/', getPayments);
router.post('/', createPayment);

module.exports = router;
