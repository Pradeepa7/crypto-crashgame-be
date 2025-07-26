const axios = require("axios");

let cache = {}; // Cache to store coin prices temporarily

// Retry with exponential backoff
async function fetchWithRetry(url, coinId, retries = 3, delay = 2000) {
  try {
    const response = await axios.get(url);
    const price = response.data[coinId]?.usd;

    if (price === undefined) throw new Error("Price not found");

    return price;
  } catch (err) {
    if (err.response?.status === 429 && retries > 0) {
      console.warn(`Rate limit hit. Retrying ${coinId} in ${delay / 1000}s...`);
      await new Promise(res => setTimeout(res, delay));
      return fetchWithRetry(url, coinId, retries - 1, delay * 2); // Exponential
    } else {
      console.error(`API fetch failed for ${coinId}:`, err.message);
      throw err;
    }
  }
}

async function getPrice(coin) {
  const coinMap = {
    BTC: "bitcoin",
    ETH: "ethereum",
  };

  const coinId = coinMap[coin.toUpperCase()];
  if (!coinId) throw new Error("Unsupported cryptocurrency");

  // Check cache (valid for 10 seconds)
  const now = Date.now();
  if (cache[coin] && now - cache[coin].timestamp < 10000) {
    return cache[coin].price;
  }

  const baseUrl = process.env.COINGECKO_API || "https://api.coingecko.com/api/v3/simple/price";
  const url = `${baseUrl}?ids=${coinId}&vs_currencies=usd`;

  try {
    const price = await fetchWithRetry(url, coinId);
    cache[coin] = { price, timestamp: now }; // Only cache on success
    return price;
  } catch (err) {
    //  Don't update cache if fetch failed
    console.error(`Final error fetching ${coin} price:`, err.message);
    throw new Error("Failed to fetch price from CoinGecko");
  }
}

module.exports = { getPrice };
