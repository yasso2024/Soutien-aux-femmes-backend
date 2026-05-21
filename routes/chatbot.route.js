const express = require("express");
const { protect } = require("../middlewares/auth.middleware");
const { sendMessage, listMessages } = require("../controllers/chatbot.controller");

const router = express.Router();

// POST /message is public — visitors can chat without an account
router.post("/message", sendMessage);
// History requires auth
router.get("/", protect, listMessages);

module.exports = router;