import { config } from './config/env';
import app from './app';
import prisma from './config/prisma';

const startServer = async () => {
  try {
    console.log('🚀 Starting VST Backend Server with Bun...');
    console.log(`📁 Environment: ${config.nodeEnv}`);
    console.log(`🔗 Database: ${config.databaseUrl.split('@')[1] || 'local'}`);
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    const server = app.listen(config.port, () => {
      console.log(`✅ Server running on port ${config.port}`);
      console.log(`🔗 Health check: http://localhost:${config.port}/health`);
      console.log('🚀 Ready to receive requests!');
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('🛑 Shutting down server...');
      
      server.close(async () => {
        console.log('✅ Server shut down');
        
        await prisma.$disconnect();
        console.log('✅ Database disconnected');
        
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      shutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown();
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
