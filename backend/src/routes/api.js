const express = require('express');
const router = express.Router();

const userRoutes = require('./userRoutes');
const authRoutes = require('./authRoutes');
const productRoutes = require('./productRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const customerRoutes = require('./customerRoutes');
const orderRoutes = require('./orderRoutes');
const deliveryRoutes = require('./deliveryRoutes');
const paymentRoutes = require('./paymentRoutes');
const reportRoutes = require('./reportRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const notificationRoutes = require('./notificationRoutes');
const settingsRoutes = require('./settingsRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/customers', customerRoutes);
router.use('/orders', orderRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/payments', paymentRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notifications', notificationRoutes);
router.use('/settings', settingsRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'LocalKart API',
  });
});

module.exports = router;
