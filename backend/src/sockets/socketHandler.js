let io = null;

const initSocket = (socketIoInstance) => {
  io = socketIoInstance;

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('join_room', (room) => {
      socket.join(room);
      console.log(`[Socket.IO] Client ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
};

const getIO = () => {
  return io;
};

// Real-time broadcast helpers
const emitNewOrder = (order) => {
  if (io) {
    io.emit('newOrder', order);
  }
};

const emitOrderUpdated = (order) => {
  if (io) {
    io.emit('orderUpdated', order);
  }
};

const emitInventoryUpdated = (data) => {
  if (io) {
    io.emit('inventoryUpdated', data);
  }
};

const emitDeliveryUpdated = (delivery) => {
  if (io) {
    io.emit('deliveryUpdated', delivery);
  }
};

const emitPaymentUpdated = (payment) => {
  if (io) {
    io.emit('paymentUpdated', payment);
  }
};

const emitNotification = (notification) => {
  if (io) {
    io.emit('newNotification', notification);
  }
};

const emitAIMessage = (data) => {
  if (io) {
    io.emit('aiMessage', data);
  }
};

const emitAIThinking = (data) => {
  if (io) {
    io.emit('aiThinking', data);
  }
};

const emitAIToolCompleted = (data) => {
  if (io) {
    io.emit('aiToolCompleted', data);
  }
};

const emitAIStatusChanged = (data) => {
  if (io) {
    io.emit('aiStatusChanged', data);
  }
};

const emitAIOrderCreated = (order) => {
  if (io) {
    io.emit('aiOrderCreated', order);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitNewOrder,
  emitOrderUpdated,
  emitInventoryUpdated,
  emitDeliveryUpdated,
  emitPaymentUpdated,
  emitNotification,
  emitAIMessage,
  emitAIThinking,
  emitAIToolCompleted,
  emitAIStatusChanged,
  emitAIOrderCreated,
};
