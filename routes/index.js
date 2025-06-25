const express = require('express');
const router = express.Router();
const userModel = require('../models/users');
const postModel = require('../models/post');
const passport = require('passport');

function isLoggedIn(req, res, next) {
    console.log('isAuthenticated:', req.isAuthenticated());
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
}

// Middleware to check if user is admin
function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.isAdminUser()) return next();
    res.status(403).render('error', { 
        error: { message: 'Access denied. Admin privileges required.' }
    });
}

// Home page
router.get('/', function(req, res) {
    res.render('index', { title: 'Express' });
});

// Register user using passport-local-mongoose
router.post('/register', function(req, res, next) {
    console.log('=== Registration Attempt ===');
    console.log('Request body:', req.body);
    
    const { username, name, password } = req.body;
    
    if (!username || !name || !password) {
        console.log('Missing required fields');
        return res.status(400).send('Missing required fields');
    }

    console.log('Creating new user with:', { username, name });
    const newUser = new userModel({ username, name });

    console.log('Attempting to register user...');
    userModel.register(newUser, password, function(err, user) {
        if (err) {
            console.log('Registration error:', err);
            return res.status(500).send('Registration failed: ' + err.message);
        }
        
        console.log('User registered successfully:', user);
        console.log('Attempting to log in user...');
        
        req.login(user, (err) => {
            if (err) {
                console.log('Auto-login error:', err);
                return next(err);
            }
            console.log('User auto-logged in successfully');
            res.redirect('/home');
        });
    });
});

// Signup page
router.get('/signup', (req, res) => {
    res.render('signup');
});

// Login page
router.get('/login', (req, res) => {
    res.render('login');
});

// Logout route
router.get('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/login');
    });
});

// Home page - fetch and display posts
router.get('/home', isLoggedIn, async (req, res) => {
    try {
        // Update the specific post that has null author
        const postId = '68416f1fa09c58f82556ccce';
        const post = await postModel.findById(postId);
        if (post && !post.author) {
            console.log('Updating post author...');
            post.author = req.user._id;
            await post.save();
            console.log('Post author updated successfully');
        }

        const posts = await postModel.find().populate('author');
        console.log('Current user:', {
            id: req.user._id,
            username: req.user.username,
            isAdmin: req.user.isAdminUser()
        });
        console.log('Posts with authors:', posts.map(post => ({
            id: post._id,
            title: post.title,
            author: post.author ? {
                id: post.author._id,
                username: post.author.username,
                isAdmin: post.author.isAdmin
            } : null
        })));
        res.render('home', { 
            posts: posts || [],
            currentUser: req.user,
            isAdmin: res.locals.isAdmin
        });
    } catch (err) {
        console.error('Error fetching posts:', err);
        res.status(500).render('error', { 
            error: { message: 'Error loading posts' }
        });
    }
});

// Create post page
router.get('/home/create', isLoggedIn, (req, res) => {
    const isAdmin = req.user.isAdminUser();
    res.render('create', { 
        currentUser: req.user,
        isAdmin: isAdmin
    });
});

// Create post action
router.post('/home/create', isLoggedIn, async (req, res) => {
    try {
        console.log('Creating post with data:', req.body);
        const { title, body, imageUrl, tags } = req.body;
        
        if (!title || !body) {
            console.log('Missing required fields');
            return res.status(400).render('error', { 
                error: { message: 'Title and body are required' }
            });
        }

        const newPost = new postModel({
            title,
            body,
            imageUrl,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            author: req.user._id
        });

        await newPost.save();
        
        // Redirect to home page after successful creation
        res.redirect('/home');
    } catch (err) {
        console.error('Error creating post:', err);
        res.status(500).render('error', { 
            error: { message: 'Error creating post: ' + err.message }
        });
    }
});

// Edit post page
router.get('/home/:id/edit', isLoggedIn, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.id);
        if (!post) {
            return res.status(404).render('error', { 
                error: { message: 'Post not found' }
            });
        }
        // Allow edit if user is admin, post author, or if it's the specific post with null author
        if (req.user.isAdminUser() || 
            (post._id.toString() === '68416f1fa09c58f82556ccce' && !post.author) || 
            (post.author && post.author.toString() === req.user._id.toString())) {
            res.render('edit', { 
                post,
                currentUser: req.user,
                isAdmin: res.locals.isAdmin
            });
        } else {
            res.status(403).render('error', { 
                error: { message: 'Not authorized to edit this post' }
            });
        }
    } catch (err) {
        console.error('Error fetching post for edit:', err);
        res.status(500).render('error', { 
            error: { message: 'Error loading post' }
        });
    }
});

// Update post action
router.post('/home/:id/edit', isLoggedIn, async (req, res) => {
    try {
        const { title, body, imageUrl, tags } = req.body;
        const post = await postModel.findById(req.params.id);
        
        if (!post) {
            return res.status(404).render('error', { 
                error: { message: 'Post not found' }
            });
        }
        
        // Allow update if user is admin, post author, or if it's the specific post with null author
        if (req.user.isAdminUser() || 
            (post._id.toString() === '68416f1fa09c58f82556ccce' && !post.author) || 
            (post.author && post.author.toString() === req.user._id.toString())) {
            post.title = title;
            post.body = body;
            post.imageUrl = imageUrl;
            post.tags = tags ? tags.split(',').map(tag => tag.trim()) : [];
            
            // If this is the post with null author, set the author to current user
            if (post._id.toString() === '68416f1fa09c58f82556ccce' && !post.author) {
                post.author = req.user._id;
            }
            
            await post.save();
            
            // Redirect to home page after successful update
            res.redirect('/home');
        } else {
            res.status(403).render('error', { 
                error: { message: 'Not authorized to edit this post' }
            });
        }
    } catch (err) {
        console.error('Error updating post:', err);
        res.status(500).render('error', { 
            error: { message: 'Error updating post: ' + err.message }
        });
    }
});

// Delete post action
router.post('/home/:id/delete', isLoggedIn, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.id);
        
        if (!post) {
            return res.status(404).render('error', { 
                error: { message: 'Post not found' }
            });
        }
        
        // Allow delete if user is admin, post author, or if it's the specific post with null author
        if (req.user.isAdminUser() || 
            (post._id.toString() === '68416f1fa09c58f82556ccce' && !post.author) || 
            (post.author && post.author.toString() === req.user._id.toString())) {
            await postModel.findByIdAndDelete(req.params.id);
            
            // Redirect to home page after successful deletion
            res.redirect('/home');
        } else {
            res.status(403).render('error', { 
                error: { message: 'Not authorized to delete this post' }
            });
        }
    } catch (err) {
        console.error('Error deleting post:', err);
        res.status(500).render('error', { 
            error: { message: 'Error deleting post: ' + err.message }
        });
    }
});

// Admin dashboard route
router.get('/admin', isAdmin, async (req, res) => {
    try {
        const posts = await postModel.find().populate('author');
        const users = await userModel.find();
        res.render('admin', { 
            posts,
            users,
            currentUser: req.user
        });
    } catch (err) {
        console.error('Error loading admin dashboard:', err);
        res.status(500).render('error', { 
            error: { message: 'Error loading admin dashboard' }
        });
    }
});

// Login authentication
router.post('/auth', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('Login error:', err);
            return res.status(500).render('error', { error: { message: 'Internal server error during login.' } });
        }
        if (!user) {
            console.warn('Login failed: Invalid username or password.', info);
            return res.status(401).render('error', { error: { message: 'Invalid username or password.' } });
        }
        req.logIn(user, (err) => {
            if (err) {
                console.error('Login session error:', err);
                return res.status(500).render('error', { error: { message: 'Failed to establish login session.' } });
            }
            // Redirect to home page after successful login
            res.redirect('/home');
        });
    })(req, res, next);
});

module.exports = router;
module.exports.isLoggedIn = isLoggedIn;
module.exports.isAdmin = isAdmin;