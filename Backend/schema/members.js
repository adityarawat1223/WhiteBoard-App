const mongoose = require('mongoose');


const members = mongoose.Schema({
    username: String,
    email: String,
    password: String
});


const User = mongoose.model('User', members);

module.exports = {User};
