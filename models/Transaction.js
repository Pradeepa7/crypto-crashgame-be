const mongoose = require('mongoose');

// Define schema for a transaction record
const transactionSchema = new mongoose.Schema({
  // ID of the player who made the transaction
  playerId: {
    type: String, // Changed from ObjectId for simplicity
    ref: 'User',
    required: true,
  },

  // USD value involved in the transaction
  usdAmount: Number,

  // Equivalent crypto amount
  cryptoAmount: Number,

  // Cryptocurrency used (e.g., BTC or ETH)
  currency: String,

  // Type of transaction: bet or cashout
  transactionType: {
    type: String,
    enum: ['bet', 'cashout']
  },

  // Unique hash to identify the transaction
  transactionHash: String,

  // Crypto price at the time of transaction
  priceAtTime: Number,

  // Timestamp when the transaction occurred
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Export the Transaction model
module.exports = mongoose.model('Transaction', transactionSchema);
