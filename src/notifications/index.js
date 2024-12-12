// src/notifications/index.js
const emailTemplates = require('./templates/emailTemplates');
const { sendEmail } = require('./services/emailService');
const { getAdminEmails } = require('../utils/dbUtils');

async function notifyAdmins(db, template, data) {
    const adminEmails = await getAdminEmails(db, data.locationId);
    
    if (adminEmails.length === 0) {
        return;
    }

    const { subject, body } = emailTemplates[template](data);
    return await sendEmail(adminEmails, subject, body);
}

module.exports = { notifyAdmins };