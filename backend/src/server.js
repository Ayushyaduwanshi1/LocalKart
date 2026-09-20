const http = require('http');
require('dotenv').config();
const { Server } = require('socket.io');
const app = require('./app');
const { connectDB } = require('./config/db');
const { initSocket } = require('./sockets/socketHandler');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5174',
    ],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true,
  },
});

initSocket(io);

// Start Server after connecting to Database
const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed database if empty
    const Product = require('./models/Product');
    const prodCount = await Product.countDocuments();
    if (prodCount === 0) {
      console.log('[Server] Empty database detected. Auto-seeding initial store data...');
      const { seedAll } = require('./seeds/seedData');
      await seedAll();
    }

    server.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` LocalKart Backend Server running on port ${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` API Endpoint: http://localhost:${PORT}/api`);
      console.log(` Health Check: http://localhost:${PORT}/api/health`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Fatal Server Boot Error:', err);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err);
});
