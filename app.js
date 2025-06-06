const express = require('express')
const mongoose = require('mongoose')
const path = require('path')
const expressSession = require("express-session")
const MongoStore = require('connect-mongo')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/users')

// Import routes
const indexRouter = require('./routes/index');
const postRouter = require('./routes/posts');

const app = express()

// Hardcoded MongoDB URI and Port
const PORT = 3000
const MONGO_URI = 'mongodb://localhost:27017/blog'

// MongoDB connection options
const mongooseOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
};

// Connect to MongoDB with error handling
mongoose.connect(MONGO_URI, mongooseOptions)
    .then(() => {
        console.log('Successfully connected to MongoDB.');
        console.log('Database:', mongoose.connection.db.databaseName);
        console.log('Host:', mongoose.connection.host);
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Log MongoDB connection events
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from MongoDB');
});

// View Engine Setup
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.set('view engine', 'ejs')

// Session configuration with MongoDB store
app.use(expressSession({
    secret: process.env.SESSION_SECRET || 'your-secret-key-should-be-in-env',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGO_URI,
        touchAfter: 24 * 3600, // time period in seconds
        ttl: 14 * 24 * 3600 // = 14 days. Default
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
    }
}));

// Passport configuration
app.use(passport.initialize())
app.use(passport.session())

passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

// Add middleware to make user and isAdmin available to all routes
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.isAdmin = req.user ? req.user.isAdminUser() : false;
    next();
});

// Use routes
app.use('/', indexRouter);
app.use('/posts', postRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Handle specific error types
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

    // Default error
    res.status(err.status || 500).render('error', { 
        error: { 
            message: err.message || 'Something went wrong!',
            status: err.status || 500
        }
    });
});

// 404 handler - must be after all other routes
app.use((req, res) => {
    res.status(404).render('error', { 
        error: { 
            message: 'Page not found',
            status: 404
        }
    });
});

app.listen(PORT)