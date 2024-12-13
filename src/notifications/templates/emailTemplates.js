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

    newLocationRegistration: (data) => ({
        subject: `🏟️ Înregistrare nouă bază sportivă - ${data.locationInfo.locationName}`,
        body: createEmailTemplate(`
            <div style="color: #1F2421; max-width: 600px; margin: 0 auto;">
                <!-- Header Banner -->
                <div style="background-color: #216869; color: white; padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0; margin-bottom: 32px;">
                    <h1 style="margin: 0; font-size: 28px; color: white;">
                        Înregistrare Nouă Bază Sportivă
                    </h1>
                    <p style="margin: 8px 0 0 0; opacity: 0.9;">
                        ${new Date().toLocaleDateString('ro-RO', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                </div>

                <!-- Admin Info Section -->
                <div style="background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 24px; padding: 24px;">
                    <h2 style="color: #216869; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 2px solid #DCE1DE; font-size: 20px;">
                        👤 Informații Administrator
                    </h2>
                    
                    <div style="display: block; margin-bottom: 8px;">
                        <div style="padding: 8px 12px; background: #F8F9FA; border-radius: 6px; margin-bottom: 8px;">
                            <strong style="color: #216869; display: inline-block; width: 100px;">Nume:</strong>
                            <span>${data.adminInfo.firstName} ${data.adminInfo.lastName}</span>
                        </div>
                        <div style="padding: 8px 12px; background: #F8F9FA; border-radius: 6px; margin-bottom: 8px;">
                            <strong style="color: #216869; display: inline-block; width: 100px;">Telefon:</strong>
                            <span>${data.adminInfo.phoneNumber}</span>
                        </div>
                        <div style="padding: 8px 12px; background: #F8F9FA; border-radius: 6px;">
                            <strong style="color: #216869; display: inline-block; width: 100px;">Email:</strong>
                            <span>${data.adminInfo.email}</span>
                        </div>
                    </div>
                </div>

                <!-- Location Info Section -->
                <div style="background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 24px; padding: 24px;">
                    <h2 style="color: #216869; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 2px solid #DCE1DE; font-size: 20px;">
                        📍 Detalii Locație
                    </h2>
                    
                    <div style="display: block; margin-bottom: 8px;">
                        <div style="padding: 8px 12px; background: #F8F9FA; border-radius: 6px; margin-bottom: 8px;">
                            <strong style="color: #216869; display: inline-block; width: 100px;">Nume:</strong>
                            <span>${data.locationInfo.locationName}</span>
                        </div>
                        <div style="padding: 8px 12px; background: #F8F9FA; border-radius: 6px; margin-bottom: 8px;">
                            <strong style="color: #216869; display: inline-block; width: 100px;">Oraș:</strong>
                            <span>${data.locationInfo.city}</span>
                        </div>
                        <div style="padding: 8px 12px; background: #F8F9FA; border-radius: 6px; margin-bottom: 8px;">
                            <strong style="color: #216869; display: inline-block; width: 100px;">Adresă:</strong>
                            <span>${data.locationInfo.address}</span>
                        </div>
                        <div style="padding: 8px 12px; background: #F8F9FA; border-radius: 6px;">
                            <strong style="color: #216869; display: inline-block; min-width: 100px;">Coordonate:</strong>
                            <span>Lat: ${data.locationInfo.lat}, Lng: ${data.locationInfo.lng}</span>
                        </div>
                    </div>
                </div>

                <!-- Courts Section -->
                <div style="background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 24px;">
                    <h2 style="color: #216869; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 2px solid #DCE1DE; font-size: 20px;">
                        ⚽ Terenuri (${data.courts.length})
                    </h2>
                    
                    <div style="display: grid; gap: 16px;">
                        ${data.courts.map((court, index) => `
                            <div style="background: #F8F9FA; border-radius: 8px; padding: 16px; border-left: 4px solid #216869;">
                                <div style="margin-bottom: 12px;">
                                    <h3 style="color: #216869; margin: 0 0 8px 0; font-size: 18px;">
                                        Teren ${index + 1}: ${court.name}
                                    </h3>
                                </div>
                                <div style="display: grid; gap: 8px;">
                                    <div style="padding: 8px; background: white; border-radius: 4px;">
                                        <strong style="color: #216869;">Sport:</strong>
                                        <span style="margin-left: 8px;">${court.sport}</span>
                                    </div>
                                    <div style="padding: 8px; background: white; border-radius: 4px;">
                                        <strong style="color: #216869;">Preț/oră:</strong>
                                        <span style="margin-left: 8px;">${court.pricePerHour} RON</span>
                                    </div>
                                    <div style="padding: 8px; background: white; border-radius: 4px;">
                                        <strong style="color: #216869;">Acoperit:</strong>
                                        <span style="margin-left: 8px;">${court.covered ? '✅ Da' : '❌ Nu'}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Footer -->
                <div style="margin-top: 32px; text-align: center; padding: 24px; background: #F8F9FA; border-radius: 8px;">
                    <p style="margin: 0; color: #666; font-size: 14px;">
                        Această notificare a fost generată automat de sistemul SportConn.
                        <br>Pentru mai multe detalii, accesează panoul de administrare.
                    </p>
                </div>
            </div>
        `)
    })


    
};

module.exports = emailTemplates