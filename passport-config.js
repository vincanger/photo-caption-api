const bcrypt = require('bcrypt');
const { User } = require('./models');
const LocalStrategy = require('passport-local').Strategy;

function initializePassport(passport) {
    const authenticateUser = async (email, password, done) => {
        const user = await User.findOne({ where: {email: email}})

        if (user == null) {
            return done(null, false, { msg: 'Invalid credentials' })
        }

        try {
            if (await bcrypt.compare(password, user.password)) {
               
                return done(null, user)
            } else {
                return done(null, false, { msg: 'Invalid credentials' })
            }
        } catch (err) {
            return done(err)
        }
    }
    passport.use(new LocalStrategy({ usernameField: 'email'}, authenticateUser))

    passport.serializeUser((user, done) => {
       return done(null, user.id)
    })

    passport.deserializeUser(async function(id, done) {
        const userId = await User.findOne({ where: {id: id}})
        try {
            return done(null, userId)
        } catch (err) {
            return done(err)
        }
    });
}

const authUser = (req, res, next) => {
    if (req.isAuthenticated()){
        console.log('user auth')
        return next()
    }
    return res.redirect('/login')
}

const notAuthUser = (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect('/captions')
    }
    console.log('user not auth')
    return next()
}

module.exports = { initializePassport, authUser, notAuthUser };