const mongoose = require('mongoose');

// Define schema for a game round
const gameRoundSchema = new mongoose.Schema({
  // Unique ID for the round (based on timestamp)
  roundId: {
    type: String,
    required: true
  },

  // Multiplier value where the round crashes
  crashPoint: {
    type: Number,
    required: true
  },

  // Array of bets placed in this round
  bets: [
    {
      // ID of the player who placed the bet
      playerId: {
        type: String, // Changed from ObjectId for flexibility
        ref: 'User',
      },
      usdAmount: Number,        // Amount in USD
      cryptoAmount: Number,     // Equivalent crypto amount
      cryptoType: String        // Cryptocurrency used (BTC or ETH)
    }
  ],

  // Array of cashouts made before the crash
  cashouts: [
    {
      // ID of the player who cashed out
      playerId: {
        type: String, // Changed from ObjectId for flexibility
        ref: 'User',
      },
      cryptoAmount: Number,     // Amount of crypto received
      multiplier: Number,       // Multiplier at time of cashout
      usdValue: Number          // USD value at time of cashout
    }
  ],

  // Timestamp when the round document is created
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Export the GameRound model
module.exports = mongoose.model('GameRound', gameRoundSchema);
