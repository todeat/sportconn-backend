const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { emailVerificationLimiter, verificationAttemptLimiter } = require('../middleware/emailRateLimiter');
const emailVerificationController = require('../controllers/emailVerificationController');

router.post('/send-code', 
    verifyToken, 
    emailVerificationLimiter,
    emailVerificationController.sendVerificationCode
);

router.post('/verify', 
    verifyToken,
    verificationAttemptLimiter,
    emailVerificationController.verifyCode
);

module.exports = router;