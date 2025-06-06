const express = require('express')
const router = express.Router()
const Post = require('../models/post')
const { isLoggedIn } = require('./index')

// Get all posts
router.get('/', async (req, res) => {
    const posts = await Post.find().populate('author')
    res.render('home', { posts })
})

// Show create post form
router.get('/create', isLoggedIn, (req, res) => {
    res.render('create')
})

// Create a new post
router.post('/create', isLoggedIn, async (req, res) => {
    const { title, body, imageUrl } = req.body
    const post = new Post({
        title,
        body,
        imageUrl,
        author: req.user._id
    })
    await post.save()
    res.redirect('/posts')
})

// Show edit post form
router.get('/:id/edit', isLoggedIn, async (req, res) => {
    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).send('Post not found')
    if (!post.author.equals(req.user._id)) return res.status(403).send('Forbidden')
    res.render('edit', { post })
})

// Edit a post
router.post('/:id/edit', isLoggedIn, async (req, res) => {
    const { title, body, imageUrl } = req.body
    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).send('Post not found')
    if (!post.author.equals(req.user._id)) return res.status(403).send('Forbidden')
    post.title = title
    post.body = body
    post.imageUrl = imageUrl
    await post.save()
    res.redirect('/posts')
})

// Delete a post
router.post('/:id/delete', isLoggedIn, async (req, res) => {
    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).send('Post not found')
    if (!post.author.equals(req.user._id)) return res.status(403).send('Forbidden')
    await post.deleteOne()
    res.redirect('/posts')
})

module.exports = router