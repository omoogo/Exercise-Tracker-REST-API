var mongoose = require('mongoose');

const { Schema } = mongoose;

var exerciseSchema = new Schema({
  _id: String,
  userId: String,
  description: String,
  duration: Number,
  date: Date
});

module.exports = mongoose.model('Exercise', exerciseSchema);