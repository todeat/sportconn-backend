// middleware/emailRateLimiter.js
const db = require('../config/db');

const EMAIL_COOLDOWN = 2 * 60 * 1000; // 2 minute între încercări
const MAX_ATTEMPTS = 3; // Număr maxim de încercări pe zi
const VERIFY_COOLDOWN = 30 * 1000; // 30 secunde între încercările de verificare

async function emailVerificationLimiter(req, res, next) {
    try {
        const uid = req.user.uid;
        
        const result = await db.query(
            `SELECT last_attempt, attempts, created_at 
             FROM mod_dms_gen_sconn___email_verifications 
             WHERE uid = $1`,
            [uid]
        );

        if (result.rows.length > 0) {
            const { last_attempt, attempts, created_at } = result.rows[0];
            const now = new Date();
            
            // Resetăm contorul de încercări dacă a trecut o zi
            if ((now - new Date(created_at)) > 24 * 60 * 60 * 1000) {
                await db.query(
                    `UPDATE mod_dms_gen_sconn___email_verifications 
                     SET attempts = 0, created_at = CURRENT_TIMESTAMP 
                     WHERE uid = $1`,
                    [uid]
                );
            } 
            // Verificăm cooldown-ul
            else if ((now - new Date(last_attempt)) < EMAIL_COOLDOWN) {
                const remainingTime = Math.ceil((EMAIL_COOLDOWN - (now - new Date(last_attempt))) / 1000);
                return res.status(429).json({
                    success: false,
                    message: `Vă rugăm așteptați ${remainingTime} secunde înainte de a solicita un nou cod.`
                });
            }
            // Verificăm numărul maxim de încercări pe zi
            else if (attempts >= MAX_ATTEMPTS) {
                return res.status(429).json({
                    success: false,
                    message: `Ați depășit numărul maxim de încercări pentru astăzi. Încercați din nou mâine.`
                });
            }
        }

        next();
    } catch (error) {
        console.error('Error in emailVerificationLimiter:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare internă la verificarea limitărilor.'
        });
    }
}

async function verificationAttemptLimiter(req, res, next) {
    try {
        const uid = req.user.uid;
        
        const result = await db.query(
            `SELECT last_attempt 
             FROM mod_dms_gen_sconn___email_verifications 
             WHERE uid = $1`,
            [uid]
        );

        if (result.rows.length > 0) {
            const { last_attempt } = result.rows[0];
            const now = new Date();
            
            if (last_attempt && (now - new Date(last_attempt)) < VERIFY_COOLDOWN) {
                const remainingTime = Math.ceil((VERIFY_COOLDOWN - (now - new Date(last_attempt))) / 1000);
                return res.status(429).json({
                    success: false,
                    message: `Vă rugăm așteptați ${remainingTime} secunde între încercări.`
                });
            }
        }

        next();
    } catch (error) {
        console.error('Error in verificationAttemptLimiter:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare internă la verificarea limitărilor.'
        });
    }
}

module.exports = {
    emailVerificationLimiter,
    verificationAttemptLimiter
};