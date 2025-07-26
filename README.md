1.  Crash Game:
    A real-time multiplayer crash betting game using Node.js, Express, MongoDB, Socket.IO, and a crypto price API. Players bet USD amounts converted to crypto, watch the multiplier grow, and attempt to cash out before the game crashes.



2.  Live Demo:
    https://cryptocrashx.netlify.app



3.  Setup Instructions:

    1. Clone the Repository

    git clone https://github.com/Pradeepa7/crypto-crashgame-be.git
    cd crypto-crashgame-be

    2.  Install Dependencies
    npm install

    3.  Configure Environment Variables
    Create a .env file:
    
    MONGO_URI=mongodb+srv://truelinetamizha9025:xxhk0C5yppWROdai@cluster0.hlijsuw.mongodb.net/crash-game?retryWrites=true&w=majority&appName=Cluster0
    CRYPTO_API_URL=https://api.coingecko.com/api/v3/simple/price

    (We use the CoinGecko API for real-time crypto prices, which doesn't require an API key. If you use another service, configure API_KEY here too.)



4. Start the Server
   npm start


5. API Endpoints:
Important Note About API Usage:

This game server is designed to run in sync with WebSocket clients.
The startGameLoop only begins after a WebSocket connection is made (typically from the frontend).
Therefore, ensure the frontend (or any WebSocket client) is running before calling API endpoints like /api/bet or /api/cashout via Postman.
This behavior ensures that the game logic runs only when users are actively connected

Place a Bet:
URL: POST /api/bet

Request:
{
"playerId": "abc123",
"usdAmount": 10,
"cryptoType": "BTC"
}
Response:
{
"message": "Bet placed successfully"
}



Cashout:
URL: POST /api/cashout

Request:
{
"playerId": "abc123"
}
Response:
{
    "playerId": "abc123",
    "usdValue": 61.1,
    "multiplier": 6.11
}



6. WebSocket Events:

- Emitted by Server

Event Name Payload                 Example
roundStart                         { "roundId": "timestamp", "crashPoint": 3.25 }
multiplierUpdate                   { "multiplier": 2.45 }
roundCrash                         { crashPoint, totalBets, totalCashouts, allBets, allCashouts }
playerCashout                      { playerId, cryptoAmount, multiplier, usdValue }



7. Provably Fair Crash Algorithm:
Crash points are determined using a deterministic and provably fair method:


function generateCrashPoint(seed, roundId) {
const hash = crypto
.createHash("sha256")
.update(seed + roundId)
.digest("hex");

const h = BigInt("0x" + hash.slice(0, 13));
const e = BigInt(2) \*\* BigInt(52);

if (h === BigInt(0)) return 1.0;

return Math.min(120, Number((e \* 100n) / (e - h)) / 100);
}


This ensures the game operator cannot manipulate the outcome.

The crash point is capped at 120x for realism.



8. USD to Crypto Conversion:
Uses real-time pricing fetched from CoinGecko:

https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd

Example conversion: usdAmount / price = cryptoAmount

When a user bets $10 and BTC is $50,000, they bet 0.0002 BTC.




9. Game Logic Overview
Each round:

- Starts with a generated crash point.
- Waits for players to place bets (max 10s).
- Multiplier begins and increases linearly.
- Players can cash out anytime before crash.
- Round ends when multiplier reaches crash point.
- If no bets are placed, the multiplier is skipped.



10. Technologies Used:

Backend: Node.js, Express
Realtime: Socket.IO
Database: MongoDB
Crypto Prices: CoinGecko API
Frontend: Plain HTML, JS, Socket.IO-client




11. License:
MIT License © Pradeepa
