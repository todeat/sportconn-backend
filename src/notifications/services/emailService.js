// src/notifications/services/emailService.js
async function sendEmail(to, subject, body) {
    try {
        const response = await fetch(process.env.EMAIL_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: Array.isArray(to) ? to.join(',') : to,
                subject,
                body,
                fromName: 'SportConn',
                replyTo: 'tudor@fluxer.ai'
            })
        });
        
        return await response.json();
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

module.exports = { sendEmail };