const express = require('express');
const router = express.Router();
const {
  getCustomers,
  lookupCustomerByPhone,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customerController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('ADMIN', 'STAFF'));

router.get('/', getCustomers);
router.get('/lookup/:phone', lookupCustomerByPhone);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', authorize('ADMIN'), deleteCustomer);

module.exports = router;
