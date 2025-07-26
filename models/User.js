const mongoose = require('mongoose');

// Define schema for a user
const userSchema = new mongoose.Schema({
  // Unique player ID (string format)
  _id: String,

  // Wallet balances for different cryptocurrencies
  wallet: {
    BTC: { type: Number, default: 0 }, // Bitcoin balance
    ETH: { type: Number, default: 0 }  // Ethereum balance
  },

  // Timestamp when the user account was created
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Export the User model
module.exports = mongoose.model('User', userSchema); // Exporting model directly
