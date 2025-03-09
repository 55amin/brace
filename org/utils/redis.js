const redis = require('redis');
const dotenv = require('dotenv');
dotenv.config();

const client = redis.createClient({ // Configure Redis client
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

const subscriber = client.duplicate(); // Configure duplicate Redis client for subscribing to channels

const redisConnect = async () => {
    await client.connect();
    await subscriber.connect();
};

module.exports = {
    client,
    subscriber,
    redisConnect
};