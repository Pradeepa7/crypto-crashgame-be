const { placeBet, cashout } = require("../services/gameService");
const User = require("../models/User");
const priceService = require("../services/priceService");

// POST /api/bet
exports.betHandler = async (req, res) => {
  try {
    const { playerId, usdAmount, cryptoType } = req.body;

    if (!playerId || !usdAmount || !cryptoType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await placeBet(playerId, usdAmount, cryptoType);
    res.status(200).json({ message: "Bet placed successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// POST /api/cashout
exports.cashoutHandler = async (req, res) => {
  try {
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: "Missing playerId" });
    }

    const result = await cashout(playerId); // Get returned data
    res.status(200).json(result); // Send it to frontend
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


// GET /api/wallet/:playerId
exports.walletHandler = async (req, res) => {
  try {
    const playerId = req.params.playerId;
    console.log('Checking wallet for:', playerId);

    const user = await User.findById(playerId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const wallet = user.wallet || { BTC: 0, ETH: 0 };

    const btcPrice = await priceService.getPrice('BTC');
    const ethPrice = await priceService.getPrice('ETH');

    const walletUSD = {
      BTC: +(wallet.BTC * btcPrice).toFixed(2),
      ETH: +(wallet.ETH * ethPrice).toFixed(2)
    };

    res.status(200).json({
      wallet,
      usdEquivalent: walletUSD
    });
  } catch (err) {
    console.error('Wallet Handler Error:', err); // log full error
    res.status(400).json({ error: err.message || 'Unknown error occurred' });
  }
};
