const express = require("express");
const { protect } = require("../middlewares/auth.middleware");
const { sendMessage, listMessages } = require("../controllers/chatbot.controller");

const router = express.Router();

router.post("/message", protect, sendMessage);
router.get("/", protect, listMessages);

module.exports = router;