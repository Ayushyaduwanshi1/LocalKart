const express = require('express');
const router = express.Router();
const {
  handleChat,
  getConversations,
  getConversationById,
  overrideConversation,
  getSettings,
  updateSettings,
  getAnalytics,
} = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.post('/chat', handleChat);
router.get('/conversations', authorize('ADMIN', 'STAFF'), getConversations);
router.get('/conversations/:id', authorize('ADMIN', 'STAFF'), getConversationById);
router.post('/conversations/:id/override', authorize('ADMIN', 'STAFF'), overrideConversation);
router.get('/settings', authorize('ADMIN', 'STAFF'), getSettings);
router.put('/settings', authorize('ADMIN'), updateSettings);
router.get('/analytics', authorize('ADMIN', 'STAFF'), getAnalytics);

module.exports = router;
