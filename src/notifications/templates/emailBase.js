// src/notifications/templates/emailBase.js

function createEmailTemplate(content) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SportConn Notification</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #DCE1DE; font-family: Arial, sans-serif;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td align="center" style="padding: 40px 0;">
                        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                            <!-- Header -->
                            <tr>
                                <td style="padding: 30px 40px; background-color: #1F2421;">
                                    <h1 style="margin: 0; font-size: 28px; color: white;">
                                        Sport<span style="color: #49A078">Conn</span>
                                    </h1>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style="padding: 40px; background-color: white;">
                                    ${content}
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="padding: 30px 40px; background-color: #216869; color: white;">
                                    <p style="margin: 0; font-size: 14px; line-height: 1.5;">
                                        © ${new Date().getFullYear()} SportConn. Toate drepturile rezervate.<br>
                                        <span style="color: #9CC5A1;">Aceasta este o notificare automată, te rugăm să nu răspunzi la acest email.</span>
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
}

module.exports = { createEmailTemplate };