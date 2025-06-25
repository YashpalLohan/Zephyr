const express = require('express')
const mongoose = require('mongoose')
const path = require('path')
const expressSession = require("express-session")
const MongoStore = require('connect-mongo')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/users')
const { ensureAdminUser } = require('../models/users');

// Import routes
const indexRouter = require('../routes/index');
const postRouter = require('../routes/posts');

const app = express()

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/blog'

const mongooseOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
};

// Connect to MongoDB with error handling (only connect once)
if (mongoose.connection.readyState === 0) {
    mongoose.connect(MONGO_URI, mongooseOptions)
        .then(async () => {
            console.log('Successfully connected to MongoDB.');
            await ensureAdminUser();
        })
        .catch(err => {
            console.error('MongoDB connection error:', err);
        });
}

// View Engine Setup
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, '../public')))
app.set('views', path.join(__dirname, '../views'))
app.set('view engine', 'ejs')

// Session configuration with MongoDB store
app.use(expressSession({
    secret: process.env.SESSION_SECRET || 'your-secret-key-should-be-in-env',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGO_URI,
        touchAfter: 24 * 3600,
        ttl: 14 * 24 * 3600
    }),
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 14 * 24 * 60 * 60 * 1000
    }
}));

// Passport configuration
app.use(passport.initialize())
app.use(passport.session())

passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(async function(id, done) {
    try {
        let user;
        if (mongoose.Types.ObjectId.isValid(id)) {
            user = await User.findById(id);
        } else {
            user = await User.findOne({ username: id });
        }
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.isAdmin = req.user ? req.user.isAdminUser() : false;
    next();
});

app.use('/', indexRouter);
app.use('/posts', postRouter);

app.use((err, req, res, next) => {
    if (err.name === 'ValidationError') {
        return res.status(400).render('error', { 
            error: { message: 'Validation Error: ' + err.message }
        });
    }
    if (err.name === 'MongoError' && err.code === 11000) {
        return res.status(400).render('error', { 
            error: { message: 'Username already exists' }
        });
    }
    res.status(err.status || 500).render('error', { 
        error: { 
            message: err.message || 'Something went wrong!',
            status: err.status || 500
        }
    });
});

app.use((req, res) => {
    res.status(404).render('error', { 
        error: { 
            message: 'Page not found',
            status: 404
        }
    });
});

module.exports = app; 