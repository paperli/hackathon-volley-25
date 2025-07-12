const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

redis.ping()
  .then((result) => {
    console.log('Redis PING result:', result); // Should print "PONG"
    process.exit(0);
  })
  .catch((err) => {
    console.error('Redis connection error:', err);
    process.exit(1);
  });