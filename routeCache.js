const { promisify } = require('util');
const redis = require('redis');
const redisClient = redis.createClient();
redisClient.on('error', (err) => {
  console.log('Redis error: ', err);
});

const getAsync = promisify(redisClient.get).bind(redisClient);
const getLrangeAsync = promisify(redisClient.lrange).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);
const setListAsync = promisify(redisClient.rpush).bind(redisClient);


let checkCache = async (req, res, next) => {
    try {
        const keyUrl = req.originalUrl;
        const userId = req.user.id;
        const keyName = `${keyUrl}${userId}`;
        console.log(keyName);
        

        let value = await getLrangeAsync(keyName, 0, -1);
        console.log(`redis get: ${value}`);
        if (value.length < 1){
            console.log(`\n-<><>-cache miss-<><>-\n`)
            return next();
        }
        console.log(`\n-<><>-cache hit-<><>-\n`)
        return res.send(value);

    } catch (err) {
        console.error(err)
        return;
    }
}

module.exports = { 
    checkCache,
    getAsync,
    getLrangeAsync, 
    setAsync,
    setListAsync
};