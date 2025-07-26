const axios = require("axios");

let cache = {}; // Cache to store coin prices temporarily

// Function to fetch the current USD price of a cryptocurrency
async function getPrice(coin) {
  const coinMap = {
    BTC: "bitcoin",
    ETH: "ethereum",
  };

  // Map the coin symbol to CoinGecko ID
  const coinId = coinMap[coin.toUpperCase()];
  if (!coinId) throw new Error("Unsupported cryptocurrency");

  // Return cached price if it was fetched within the last 10 seconds
  if (cache[coin] && Date.now() - cache[coin].timestamp < 10000) {
    return cache[coin].price;
  }

  // Build the API URL to fetch live price from CoinGecko
  const url = `${process.env.COINGECKO_API}?ids=${coinId}&vs_currencies=usd`;

  // Send GET request to the API
  const response = await axios.get(url);

  // Extract price from response and update cache
  const price = response.data[coinId].usd;
  cache[coin] = { price, timestamp: Date.now() };

  return price; // Return the current USD price
}

// Export the getPrice function for use in other files
module.exports = { getPrice };
