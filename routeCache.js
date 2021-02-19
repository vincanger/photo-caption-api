const { promisify } = require('util');
let { redisClient } = require('./app');

if (process.env.REDIS_TLS_URL) {
    redisClient = require('redis').createClient(process.env.REDIS_TLS_URL, {
        tls: {
            rejectUnauthorized: false
        }
    });
} else {
    redisClient = require('redis').createClient();
}

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