// middleware/emailVerifiedMiddleware.js

const { isUserEmailVerified } = require("../utils/dbUtils");


async function requireVerifiedEmail(req, res, next) {
    try {
        const uid = req.user.uid;
        
        const isVerified = await isUserEmailVerified(uid);
        if (!isVerified) {
            return res.status(403).json({
                success: false,
                message: "Email-ul trebuie să fie verificat pentru a efectua această acțiune.",
                requiresVerification: true
            });
        }
        
        next();
    } catch (error) {
        console.error("Error in email verification middleware:", error);
        res.status(500).json({
            success: false,
            message: "Eroare la verificarea email-ului"
        });
    }
}

module.exports = requireVerifiedEmail;