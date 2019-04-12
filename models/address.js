const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PointSchema = new Schema({
  type: {
    type: String,
    default: 'Point'
  },
  coordinates: {
    type: [Number],
    index: '2dsphere'
  }
});

const AddressSchema = new Schema({
  street: {
    type: String,
    required: true
  },
  number: {
    type: Number,
    required: true
  },
  suffix: {
    type: String
  },
  postal_code: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  country: {
    type: String,
    default: 'Nederland'
  },
  geometry: {
    type: PointSchema,
    required: true
  }
});

module.exports = AddressSchema;
