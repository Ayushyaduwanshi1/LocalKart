const express = require('express');
const router = express.Router();
const {
  getInventory,
  adjustStock,
  getInventoryHistory,
} = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(authorize('ADMIN', 'STAFF'));

router.get('/', getInventory);
router.post('/adjust', adjustStock);
router.get('/history', getInventoryHistory);

module.exports = router;
