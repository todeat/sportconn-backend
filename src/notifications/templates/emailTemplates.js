const { createEmailTemplate } = require("./emailBase");

// src/notifications/templates/emailTemplates.js
const emailTemplates = {
    newReservation: (data) => ({
        subject: `Rezervare nouă - ${data.locationName}`,
        body: createEmailTemplate(`
            <div style="color: #1F2421;">
                <h2 style="color: #216869; margin-bottom: 24px; font-size: 24px;">
                    Rezervare nouă - ${data.locationName}
                </h2>
                
                <div style="background-color: #DCE1DE; padding: 20px; border-radius: 6px; margin-bottom: 24px;">
                    <p style="margin: 0; color: #216869; font-weight: bold; font-size: 16px;">
                        Detalii rezervare:
                    </p>
                </div>

                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #DCE1DE;">
                            <strong style="color: #216869;">Sport:</strong>
                            <span style="margin-left: 8px;">${data.sportName}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #DCE1DE;">
                            <strong style="color: #216869;">Teren:</strong>
                            <span style="margin-left: 8px;">${data.courtName}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #DCE1DE;">
                            <strong style="color: #216869;">Data:</strong>
                            <span style="margin-left: 8px;">${new Date(data.startTime).toLocaleDateString('ro-RO')}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #DCE1DE;">
                            <strong style="color: #216869;">Interval orar:</strong>
                            <span style="margin-left: 8px;">
                                ${new Date(data.startTime).toLocaleTimeString('ro-RO')} - 
                                ${new Date(data.endTime).toLocaleTimeString('ro-RO')}
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #DCE1DE;">
                            <strong style="color: #216869;">Client:</strong>
                            <span style="margin-left: 8px;">${data.clientName}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #DCE1DE;">
                            <strong style="color: #216869;">Telefon:</strong>
                            <span style="margin-left: 8px;">${data.clientPhone}</span>
                        </td>
                    </tr>
                    <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #DCE1DE;">
                        <strong style="color: #216869;">Preț total:</strong>
                        <span style="margin-left: 8px;">${data.totalPrice} RON</span>
                    </td>
                    </tr>
                </table>

                <div style="margin-top: 32px; padding: 16px; background-color: #9CC5A1; border-radius: 6px; color: #1F2421;">
                    <p style="margin: 0; font-size: 14px;">
                        Pentru mai multe detalii, accesează contul tău SportConn.
                    </p>
                </div>
            </div>
        `)
    }),

    
};

module.exports = emailTemplates