const express = require('express');
const router = express.Router();
const {
  getSalesReport,
  getProductSalesReport,
  getCustomerReport,
  getInventoryReport,
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('ADMIN'));

router.get('/sales', getSalesReport);
router.get('/products', getProductSalesReport);
router.get('/customers', getCustomerReport);
router.get('/inventory', getInventoryReport);

module.exports = router;
