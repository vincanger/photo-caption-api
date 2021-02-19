if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const session = require('express-session');
const { checkCache, setAsync, setListAsync, getAsync, getLrangeAsync } = require('./routeCache');
const { sequelize, User, Caption } = require('./models');
const { initializePassport, authUser, notAuthUser } = require('./passport-config');

const PORT = process.env.PORT || 5000;
const app = express();

const redis = require('redis');
let redisClient = redis.createClient();
if (process.env.REDIS_URL) {
    redisClient = redis.createClient(process.env.REDIS_URL, {
        tls: {
            rejectUnauthorized: false
        }
    });
}
redisClient.on('error', (err) => {
    console.log('Redis error: ', err);
});
const redisStore = require('connect-redis')(session);

initializePassport(passport);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    store: new redisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 60000 *  60 * 24 }
}));
app.use(passport.initialize());
app.use(passport.session());

//--<><>--< Authentication >--<><>--//
// register route
app.post('/register', notAuthUser, async (req, res) => {
    const { name, email } = req.body
    const hashed = await bcrypt.hash(req.body.password, 10)

    try {
       const user = await User.create({ name, email, password: hashed }) 
       return res.json(user)
    } catch (err) {
        console.log(err)
        return res.status(500).json(err)
    }
}); 

// login route
app.post('/login', notAuthUser, passport.authenticate('local', {
    successRedirect: '/captions',
    failureRedirect: '/login'
}));

// logout route
app.get('/logout', authUser, (req, res) => {
    req.session.destroy(err => {
        res.redirect('/login');
     });
})

//--<><>--< Fun Stuff >--<><>--//
//get all images & captions in DB 
app.get('/captions', authUser, async (req, res) => {
    console.log(`-<>- Session ID: ${req.sessionID}`)
    try {
        const allCaptions = await Caption.findAll({ include: [ {model: User, attributes: ['id', 'name'] } ] })
        return res.json(allCaptions)
    } catch (err) {
        console.log(err)
        return res.status(500).json(err)
    }
})

//create a new caption based on pic_id and user_id in DB
app.post('/captions', authUser, async (req, res) => {
    const { picId, caption, picUrl } = req.body;
    const userId = req.user.id; // sent by passport session
    try {
        const user = await User.findOne({ where: {id: userId}})
        const newCaption = await Caption.create({ pic_id: picId, caption, user_id: user.id, pic_file_name: picUrl })
        return res.json(newCaption)
    } catch (err) {
        console.log(err)
        return res.status(500).json(err)
    }
})

// update caption
app.put('/captions/:id', authUser, async (req, res) => {
    const captionId = req.params.id
    const { caption } = req.body;
    try {
        const updateCaption = await Caption.update({ caption }, {
            where: { id: captionId },
            returning: true
        })
        return res.json(updateCaption['1'])
    } catch (err) {
        console.log(err)
        return res.status(500).json(err)
    }
})

//get all captions based on user_id in DB <---- 
app.get('/captions/:userId', authUser, async (req, res) => {
    const { userId } = req.params
    try {
        const allCaptions = await Caption.findAll({ include: [ {model: User, attributes: ['id', 'name'] } ], where: {user_id: userId}})
        return res.json(allCaptions)
    } catch (err) {
        console.log(err)
        return res.status(500).json(err)
    }
})

//get image & its captions based on image id in DB 
app.get('/images/:picId', authUser, async (req, res) => {
    const { picId } = req.params
    try {
        const oneImage = await Caption.findAll({ include: [ {model: User, attributes: ['id', 'name'] } ], where: {pic_id: picId}})
        if (oneImage === null) return res.status(404).json({ msg: "Img doesn't exist"})
        return res.json(oneImage)
    } catch (err) {
        console.log(err)
        return res.status(500).json(err)
    }
})

/* 
This route isn't really necessary ¯\_(ツ)_/¯
I just wanted to practice filtering results and using server-side cache
*/
// get image filenames only if they already have a caption
app.get('/images', authUser, checkCache, async (req, res) => {
    const keyUrl = req.originalUrl;
    const userId = req.user.id;
    const keyName = `${keyUrl}${userId}`;
    try {
        const images = await Caption.findAll()
        
        if (images === null) return res.status(404).json({ msg: "Images don't exist"})
        const filteruniquebyIDName = images.filter(
            (v, i, a) => a.findIndex(t => t.id === v.id || t.pic_file_name === v.pic_file_name) === i
        )
        let picFileNames = [];
        for ([key, value] of Object.entries(filteruniquebyIDName)) {
            picFileNames.push(value.pic_file_name)
        }
        console.log(picFileNames);
        
        setListAsync(keyName, picFileNames);

        return res.json(picFileNames)
    } catch (err) {
        console.log(err)
        return res.status(500).json(err)
    }
})

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`)
    // await sequelize.sync({alter: true});
    await sequelize.authenticate();
    console.log(`\n<><>< DB is UP! ><><>\n`);
})