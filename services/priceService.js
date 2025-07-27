const axios = require("axios");

const globalPriceCache = {
  BTC: { price: 0, timestamp: 0 },
  ETH: { price: 0, timestamp: 0 },
};

const coinMap = {
  BTC: "bitcoin",
  ETH: "ethereum",
};

const baseUrl = process.env.COINGECKO_API || "https://api.coingecko.com/api/v3/simple/price";

// Function to start polling prices every 10 seconds
function startPricePolling() {
  setInterval(async () => {
    for (const [symbol, coinId] of Object.entries(coinMap)) {
      try {
        const url = `${baseUrl}?ids=${coinId}&vs_currencies=usd`;
        const response = await axios.get(url);
        const price = response.data[coinId]?.usd;

        if (price) {
          globalPriceCache[symbol] = { price, timestamp: Date.now() };
          console.log(`Updated ${symbol} price: $${price}`);
        }
      } catch (err) {
        console.error(`Error fetching ${symbol}:`, err.message);
      }
    }
  }, 10000); // every 10 seconds
}

// Start polling immediately
startPricePolling();

// Function used inside route handlers
function getPrice(coin) {
  const upper = coin.toUpperCase();
  if (!coinMap[upper]) throw new Error("Unsupported cryptocurrency");

  const cached = globalPriceCache[upper];
  if (!cached || cached.price === 0) throw new Error("Price not yet available");

  return cached.price;
}

module.exports = { getPrice };
