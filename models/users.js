const mongoose = require('mongoose')
const passportLocalMongoose = require('passport-local-mongoose')

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    }],
    isAdmin: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})

UserSchema.plugin(passportLocalMongoose)

UserSchema.methods.isAdminUser = function() {
    return this.isAdmin
}

module.exports = mongoose.model('User', UserSchema)

// Create admin user if it doesn't exist
const createAdminUser = async () => {
    // First, remove any existing admin user
    await mongoose.model('User').deleteOne({ username: 'admin' })
    
    // Create new admin user with custom credentials
    const admin = new mongoose.model('User')({
        username: 'admin', 
        name: 'Admin Yashpal',
        isAdmin: true
    })
    
    await mongoose.model('User').register(admin, '0.0.0.0.'); 
}

// Call the function to create admin user
createAdminUser()