const crypto = require("crypto");
const GameRound = require("../models/GameRound");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const priceService = require("./priceService");

// Game state variables
let currentRound = null;
let players = {}; // Stores player data per round: { playerId: { amount, crypto, priceAtBetTime } }
let multiplier = 1;
let crashPoint = 0;
let roundInterval = null;
let ioInstance;
let multiplierStartTime = null;
let betReceived = false;
let betResolver = null;

// Generate deterministic crash point based on seed and roundId
function generateCrashPoint(seed, roundId) {
  const hash = crypto
    .createHash("sha256")
    .update(seed + roundId)
    .digest("hex");

  const h = BigInt("0x" + hash.slice(0, 13)); // Convert first 13 hex characters to BigInt
  const e = BigInt(2) ** BigInt(52); // 2^52

  if (h === BigInt(0)) return 1.0; // Prevent divide-by-zero

  const result = Number((e * BigInt(100)) / (e - h)) / 100;

  return Math.min(120, +result.toFixed(2)); // Cap result at 120x
}

// Calculate how long the multiplier has been running
function multiplierDuration() {
  return Date.now() - multiplierStartTime;
}

// Start a new round
async function startRound() {
  players = {};
  multiplier = 1;

  const roundId = Date.now().toString(); // Use timestamp as roundId
  const seed = "static-secret-seed"; // Seed for crash point generation

  crashPoint = +generateCrashPoint(seed, roundId).toFixed(2);

  currentRound = {
    roundId,
    crashPoint,
    bets: [],
    cashouts: [],
  };

  console.log("Round Started!");
  console.log("Crash Point:", crashPoint);

  // Notify all clients of round start
  ioInstance.emit("roundStart", { roundId, crashPoint });
}

// Run multiplier loop until crash point is reached
function runMultiplierLoop() {
  return new Promise((resolve) => {
    multiplierStartTime = Date.now();
    const duration = 10000; // 10 seconds max
    const startMultiplier = 1;
    const targetMultiplier = crashPoint;
    const interval = 250; // update every 250ms

    roundInterval = setInterval(() => {
      const elapsed = Date.now() - multiplierStartTime;
      const progress = Math.min(elapsed / duration, 1); // percentage of duration passed

      // Calculate current multiplier using linear interpolation
      multiplier = +(
        startMultiplier +
        (targetMultiplier - startMultiplier) * progress
      ).toFixed(2);

      // Send multiplier update to clients
      ioInstance.emit("multiplierUpdate", { multiplier });

      if (progress >= 1 || multiplier >= crashPoint) {
        clearInterval(roundInterval); // Stop loop
        resolve(); // End round
      }
    }, interval);
  });
}

// End current round
function endRound() {
  if (roundInterval) {
    clearInterval(roundInterval);
    roundInterval = null;
  }

  const duration = multiplierDuration();
  console.log(`Multiplier lasted: ${(duration / 1000).toFixed(2)}s`);
  console.log("Round Ended | Crashed at:", crashPoint);

  const allBets = currentRound?.bets?.map((b) => ({
    playerId: b.playerId,
    usdAmount: b.usdAmount,
  })) || [];

  const allCashouts = currentRound?.cashouts?.map((c) => ({
    playerId: c.playerId,
    usdValue: c.usdValue,
    multiplier: c.multiplier,
  })) || [];

  ioInstance.emit("roundCrash", {
    crashPoint,
    duration: +(duration / 1000).toFixed(2),
    totalBets: allBets.length,
    totalCashouts: allCashouts.length,
    allBets,
    allCashouts,
  });

  // Save round only if it exists in DB
  if (currentRound._id) {
    currentRound.markModified("bets");
    currentRound.markModified("cashouts");
    currentRound.save().catch((err) => {
      console.error("Failed to save current round:", err.message);
    });
  }

  // Reset state
  players = {};
  multiplierStartTime = null;

  console.log(`Total Bets: ${currentRound?.bets?.length || 0}`);
  console.log(`Total Cashouts: ${currentRound?.cashouts?.length || 0}`);
}


// Run a full round including wait for bets, multiplier, and crash
async function runOneRound() {
  try {
    await startRound();
    console.log("Waiting for a bet...");

    // Wait for a player to bet or 10 seconds timeout
    await new Promise((resolve) => {
      betReceived = false;
      betResolver = resolve;

      setTimeout(() => {
        if (!betReceived) {
          console.log("No bet received. Skipping multiplier.");
          resolve(); // Skip round if no bets
        }
      }, 10000);
    });

    // Start multiplier if there was a bet
    await runMultiplierLoop();

    // End round after crash
    endRound();
  } catch (err) {
    console.error("Error in round:", err);
  }

  // Wait before next round (ensure minimum gap)
  const totalRoundDuration = 10000;
  const elapsed = multiplierDuration();
  const remainingTime = totalRoundDuration - elapsed;
  const delay = Math.max(remainingTime, 3000); // minimum 3s delay

  console.log(`Next round in ${delay / 3000}s`);
  setTimeout(runOneRound, delay);
}

// Start the game loop for the first time
async function startGameLoop(io) {
  ioInstance = io;
  await runOneRound();
}

// Handle placing a bet
async function placeBet(playerId, usdAmount, cryptoType) {
  if (!currentRound) throw new Error("Game round has not started yet");

  const price = priceService.getPrice(cryptoType);
  const cryptoAmount = usdAmount / price;

  let user = await User.findById(playerId);
  if (!user) {
    user = await User.create({
      _id: playerId,
      wallet: { BTC: 5, ETH: 5 },
    });
  }

  if (user.wallet[cryptoType] < cryptoAmount) {
    throw new Error("Insufficient funds");
  }

  user.wallet[cryptoType] -= cryptoAmount;
  await user.save();

  // Create DB record for the round on first bet only
  if (!currentRound._id) {
    const newRound = await GameRound.create({
      roundId: currentRound.roundId,
      crashPoint: currentRound.crashPoint,
      bets: [],
      cashouts: [],
    });
    currentRound = newRound;
  }

  // Track player locally
  players[playerId] = {
    usdAmount,
    cryptoType,
    cryptoAmount,
    priceAtBetTime: price,
  };

  // Create bet transaction
  await Transaction.create({
    playerId,
    usdAmount,
    cryptoAmount,
    currency: cryptoType,
    transactionType: "bet",
    transactionHash: crypto.randomUUID(),
    priceAtTime: price,
    timestamp: new Date(),
  });

 await GameRound.updateOne(
  { _id: currentRound._id },
  { $push: { bets: { playerId, usdAmount, cryptoAmount, cryptoType } } }
);

  if (!betReceived && betResolver) {
    betReceived = true;
    betResolver(); // resume round
  }
}


// Handle cashing out a player's bet
async function cashout(playerId) {
  if (!players[playerId]) {
    let user = await User.findById(playerId);
    if (!user) {
      user = await User.create({
        _id: playerId,
        wallet: { BTC: 5, ETH: 5 },
      });
    }
    throw new Error("Player did not bet this round or already cashed out");
  }

  // Prevent cashout after crash
  if (multiplier >= crashPoint) {
    throw new Error("Cannot cash out after crash");
  }

  const { cryptoAmount, priceAtBetTime, cryptoType } = players[playerId];
  const payout = +(cryptoAmount * multiplier).toFixed(8); // Calculate payout

  const user = await User.findById(playerId);
  user.wallet[cryptoType] += payout; // Add payout to user wallet
  await user.save();

  // Record the cashout transaction
  await Transaction.create({
    playerId,
    usdAmount: payout * priceAtBetTime,
    cryptoAmount: payout,
    currency: cryptoType,
    transactionType: "cashout",
    transactionHash: crypto.randomUUID(),
    priceAtTime: priceAtBetTime,
    timestamp: new Date(),
  });

  await GameRound.updateOne(
  { _id: currentRound._id },
  {
    $push: {
      cashouts: {
        playerId,
        cryptoAmount: payout,
        multiplier,
        usdValue: payout * priceAtBetTime,
      },
    },
  }
);


  // Notify clients of cashout
  ioInstance.emit("playerCashout", {
    playerId,
    cryptoAmount: payout,
    multiplier,
    usdValue: payout * priceAtBetTime,
  });

  // Remove player from active players
  delete players[playerId];

  // Return useful data to controller
  return {
    playerId,
    usdValue: +(payout * priceAtBetTime).toFixed(2), // ensure 2 decimals
    multiplier,
  };
}

// Export public functions
module.exports = {
  startGameLoop,
  placeBet,
  cashout,
};
