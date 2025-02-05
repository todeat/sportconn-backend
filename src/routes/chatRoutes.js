const express = require('express');
const router = express.Router();
const { ChatService } = require('../services/chatService');

const chatService = new ChatService(process.env.OPENAI_API_KEY);

router.post('/session', async (req, res) => {
    try {
        const { locationId } = req.body;
        if (!locationId) {
            return res.status(400).json({ success: false, message: 'LocationId este obligatoriu' });
        }

        const sessionId = await chatService.createSession(locationId);
        res.json({ success: true, sessionId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/message', async (req, res) => {
    try {
        const { sessionId, message } = req.body;
        if (!sessionId || !message) {
            return res.status(400).json({
                success: false,
                message: 'SessionId și mesajul sunt obligatorii'
            });
        }

        const response = await chatService.processMessage(sessionId, message);
        res.json(response);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;