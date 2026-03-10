const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { envoyerMessage, obtenirConversation, obtenirConversations } = require('../controllers/message.controller');

router.post('/',               protect, envoyerMessage);
router.get('/conversations',   protect, obtenirConversations);
router.get('/:userId',         protect, obtenirConversation);

module.exports = router;
