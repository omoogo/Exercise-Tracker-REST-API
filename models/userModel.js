const mongoose = require('mongoose');

const { Schema } = mongoose;

var userSchema = new Schema({
  _id: String,
  username: String
});

module.exports = mongoose.model('User', userSchema);