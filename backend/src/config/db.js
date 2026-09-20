const mongoose = require('mongoose');

let mongoMemoryServer = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  try {
    if (uri && !uri.includes('localhost:27017')) {
      console.log(`[Database] Connecting to configured MONGODB_URI...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
      });
      console.log(`[Database] Connected successfully to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);
      return;
    }

    // Attempt default/local URI first if specified
    if (uri) {
      try {
        console.log(`[Database] Attempting connection to local MongoDB at ${uri}...`);
        await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 2500,
        });
        console.log(`[Database] Connected successfully to local MongoDB at ${uri}`);
        return;
      } catch (localErr) {
        console.warn(`[Database] Local MongoDB unavailable (${localErr.message}). Switching to in-memory MongoDB for development...`);
      }
    }

    // Fallback to MongoMemoryServer
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'localkart',
        },
      });
      const memoryUri = mongoMemoryServer.getUri();
      console.log(`[Database] Starting In-Memory MongoDB Server...`);
      await mongoose.connect(memoryUri);
      console.log(`[Database] Connected to In-Memory MongoDB at ${memoryUri}`);
    } catch (memErr) {
      console.error('[Database] Failed to initialize in-memory fallback:', memErr);
      throw memErr;
    }
  } catch (error) {
    console.error(`[Database Error] ${error.message}`);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
    console.log('[Database] Disconnected');
  } catch (err) {
    console.error('[Database Disconnect Error]', err);
  }
};

module.exports = { connectDB, disconnectDB };
