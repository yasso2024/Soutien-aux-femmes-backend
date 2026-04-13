const chatbotMessageModel = require("../models/chatbotMessage.model");

async function sendMessage(req, res) {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        status: false,
        message: "Message obligatoire",
      });
    }

    const userId = req.user?._id || null;

    await chatbotMessageModel.create({
      userId,
      sender: "user",
      message,
    });

    const reply = `Vous avez écrit : ${message}`;

    await chatbotMessageModel.create({
      userId,
      sender: "bot",
      message: reply,
    });

    return res.status(200).json({
      status: true,
      reply,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
}

async function listMessages(req, res) {
  try {
    const userId = req.user?._id || null;
    const filter = userId ? { userId } : {};

    const messages = await chatbotMessageModel.find(filter).sort({ createdAt: 1 });

    return res.status(200).json({
      status: true,
      messages,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
}

module.exports = {
  sendMessage,
  listMessages,
};