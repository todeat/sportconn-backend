// middleware/pendingLocationMiddleware.js
const { hasPendingLocation } = require('../utils/dbUtils');

async function checkPendingLocation(req, res, next) {
    try {
        const uid = req.user.uid;
        
        const hasPending = await hasPendingLocation(uid);
        if (hasPending) {
            return res.status(403).json({
                success: false,
                message: "Aveți deja o cerere de înregistrare a unei baze sportive în așteptare. Vă rugăm să așteptați procesarea acesteia înainte de a adăuga o nouă locație."
            });
        }
        
        next();
    } catch (error) {
        console.error("Error in pending location check:", error);
        res.status(500).json({
            success: false,
            message: "Eroare la verificarea locațiilor în așteptare"
        });
    }
}

module.exports = checkPendingLocation;