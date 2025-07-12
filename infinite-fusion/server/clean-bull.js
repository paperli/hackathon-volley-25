const Queue = require('bull');
require('dotenv').config();

const redisUrl = process.env.REDIS_URL || process.env.REDISCLOUD_URL;
const imageQueue = new Queue('image-generation', redisUrl, {
  redis: {
    tls: { rejectUnauthorized: false }
  }
});

async function cleanJobs() {
  try {
    // Clean completed jobs older than 1 hour
    await imageQueue.clean(600 * 1000, 'completed');
    console.log('Cleaned completed jobs older than 10 min');
    // Clean failed jobs older than 1 hour
    await imageQueue.clean(600 * 1000, 'failed');
    console.log('Cleaned failed jobs older than 10 min');
    process.exit(0);
  } catch (err) {
    console.error('Error cleaning jobs:', err);
    process.exit(1);
  }
}

cleanJobs(); 