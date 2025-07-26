const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

/* GET game routes page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'welcome game routes page..' });
});

// POST /api/bet - Place bet
router.post('/bet', gameController.betHandler);

// POST /api/cashout - Cash out before crash
router.post('/cashout', gameController.cashoutHandler);

// GET /api/wallet/:playerId - Check wallet
router.get('/wallet/:playerId', gameController.walletHandler);

module.exports = router;
