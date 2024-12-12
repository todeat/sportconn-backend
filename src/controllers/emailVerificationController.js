// controllers/emailVerificationController.js
const emailVerificationModel = require('../models/emailVerificationModel');
const { getUserEmailByUid, isUserEmailVerified } = require('../utils/dbUtils');

exports.sendVerificationCode = async (req, res) => {
    try {
        const uid = req.user.uid;

        // Verificăm mai întâi dacă email-ul este deja verificat
        const isVerified = await isUserEmailVerified(uid);
        if (isVerified) {
            return res.status(400).json({
                success: false,
                message: 'Acest email este deja verificat'
            });
        }

        // Obținem email-ul din baza de date
        const email = await getUserEmailByUid(uid);
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Nu s-a găsit un email asociat acestui cont'
            });
        }

        const result = await emailVerificationModel.createOrUpdateVerification(uid, email);
        res.json(result);

    } catch (error) {
        console.error('Error in sendVerificationCode:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Eroare la trimiterea codului de verificare'
        });
    }
};

exports.verifyCode = async (req, res) => {
    try {
        const { code } = req.body;
        const uid = req.user.uid;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Codul de verificare este obligatoriu'
            });
        }

        // Verificăm dacă email-ul este deja verificat
        const isVerified = await isUserEmailVerified(uid);
        if (isVerified) {
            return res.status(400).json({
                success: false,
                message: 'Acest email este deja verificat'
            });
        }

        const result = await emailVerificationModel.verifyCode(uid, code);
        res.json(result);

    } catch (error) {
        console.error('Error in verifyCode:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Eroare la verificarea codului'
        });
    }
};