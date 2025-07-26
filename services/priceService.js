const axios = require("axios");

let cache = {}; // Cache to store coin prices temporarily

// Function to fetch the current USD price of a cryptocurrency
async function getPrice(coin) {
  const coinMap = {
    BTC: "bitcoin",
    ETH: "ethereum",
  };

  const coinId = coinMap[coin.toUpperCase()];
  if (!coinId) throw new Error("Unsupported cryptocurrency");

  // Return cached price if fetched within the last 10 seconds
  if (cache[coin] && Date.now() - cache[coin].timestamp < 10000) {
    return cache[coin].price;
  }

  const baseUrl = process.env.COINGECKO_API;
  const url = `${baseUrl}?ids=${coinId}&vs_currencies=usd`;

  try {
    const response = await axios.get(url);
    const price = response.data[coinId]?.usd;

    if (price === undefined) throw new Error("Price not found");

    cache[coin] = { price, timestamp: Date.now() };
    return price;
  } catch (err) {
    console.error(`Error fetching ${coin} price:`, err.message);
    throw new Error("Failed to fetch price from CoinGecko");
  }
}

module.exports = { getPrice };
