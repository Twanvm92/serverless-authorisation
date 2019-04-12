const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Address = require('./address');

const UserSchema = new Schema({
  email: {
    required: true,
    type: String
  },
  password: {
    required: true,
    type: String
  },
  firstname: {
    required: true,
    type: String
  },
  lastname: {
    required: true,
    type: String
  },
  birth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    required: true
  },
  favorite_sports: [String],
  biography: String,
  address: {
    required: true,
    type: Address
  }

});

const User = mongoose.model('user', UserSchema);

module.exports = User;
