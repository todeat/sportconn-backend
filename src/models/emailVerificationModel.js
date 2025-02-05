// models/emailVerificationModel.js
const db = require('../config/db');

const VERIFICATION_CODE_LENGTH = 6;
const CODE_EXPIRATION_MINUTES = 30;

function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, code) {
    const emailBody = `
        <h2>Verificare adresă email SportConn</h2>
        <p>Codul tău de verificare este: <strong>${code}</strong></p>
        <p>Acest cod expiră în ${CODE_EXPIRATION_MINUTES} minute.</p>
        <p>Dacă nu ai solicitat acest cod, te rugăm să ignori acest email.</p>
    `;

    try {
        const response = await fetch(process.env.EMAIL_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: email,
                subject: 'Cod verificare SportConn',
                body: emailBody,
                fromName: 'SportConn',
                replyTo: '247@fluxer.ai'
            })
        });

        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw new Error('Eroare la trimiterea email-ului de verificare');
    }
}

async function createOrUpdateVerification(uid, email) {
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000);

    try {
        const updateResult = await db.query(
            `UPDATE mod_dms_gen_sconn___email_verifications 
             SET code = $1, 
                 attempts = attempts + 1,
                 last_attempt = CURRENT_TIMESTAMP,
                 expires_at = $2,
                 is_verified = false
             WHERE uid = $3
             RETURNING id`,
            [code, expiresAt, uid] 
        );

        if (updateResult.rows.length === 0) {
            await db.query(
                `INSERT INTO mod_dms_gen_sconn___email_verifications 
                 (uid, email, code, expires_at, attempts)
                 VALUES ($1, $2, $3, $4, 1)`,
                [uid, email, code, expiresAt]
            );
        }

        const emailSent = await sendVerificationEmail(email, code);
        
        if (!emailSent) {
            throw new Error('Eroare la trimiterea email-ului');
        }

        return {
            success: true,
            message: 'Codul de verificare a fost trimis pe email'
        };

    } catch (error) {
        console.error('Error in createOrUpdateVerification:', error);
        throw error;
    }
}


async function verifyCode(uid, code) {
    try {
        const result = await db.query(
            `SELECT * FROM mod_dms_gen_sconn___email_verifications 
             WHERE uid = $1 AND is_verified = false`,
            [uid]
        );

        if (result.rows.length === 0) {
            return {
                success: false,
                message: 'Nu există o verificare în așteptare pentru acest utilizator'
            };
        }

        const verification = result.rows[0];

        if (new Date() > new Date(verification.expires_at)) {
            return {
                success: false,
                message: 'Codul de verificare a expirat'
            };
        }

        if (verification.code !== code) {
            await db.query(
                `UPDATE mod_dms_gen_sconn___email_verifications 
                 SET attempts = attempts + 1,
                     last_attempt = CURRENT_TIMESTAMP
                 WHERE uid = $1`,
                [uid]
            );

            return {
                success: false,
                message: 'Cod de verificare invalid'
            };
        }

        await db.query(
            `UPDATE mod_dms_gen_sconn___email_verifications 
             SET is_verified = true 
             WHERE uid = $1`,
            [uid]
        );

        return {
            success: true,
            message: 'Email verificat cu succes'
        };

    } catch (error) {
        console.error('Error in verifyCode:', error);
        throw error;
    }
}

module.exports = {
    createOrUpdateVerification,
    verifyCode
};