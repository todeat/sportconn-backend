const OpenAI = require('openai');
const admin = require('firebase-admin');
const { getAllLocationInfo } = require('../utils/locationQueries');

class ChatService {
    constructor(apiKey) {
        this.openai = new OpenAI({ apiKey });
        this.firestore = admin.firestore();
    }

    async createSession(locationId) {
        const sessionRef = await this.firestore.collection('chatSessions').add({
            locationId,
            createdAt: admin.firestore.Timestamp.now(),
            messages: []
        });
        return sessionRef.id;
    }

    async generateSystemPrompt(locationId) {
        const locationData = await getAllLocationInfo(locationId);
        if (!locationData || !locationData.success) {
            throw new Error('Locația nu a fost găsită');
        }

        const info = locationData.locationInfo;
        
        const scheduleByDay = {
            'Luni': 1, 'Marți': 2, 'Miercuri': 3, 'Joi': 4, 
            'Vineri': 5, 'Sâmbătă': 6, 'Duminică': 0
        };
        
        const openDays = info.schedule
    .filter(s => s.isOpen)
    .map(s => {
        const day = Object.keys(scheduleByDay).find(k => scheduleByDay[k] === s.dayOfWeek);
        return `${day}: ${s.oraStart.slice(0, 5)} - ${s.oraEnd.slice(0, 5)}`;
    })
    .join('\n');

    const courtsBySport = info.courts.reduce((acc, court) => {
        if (!acc[court.sport]) acc[court.sport] = [];
        acc[court.sport].push({
            name: court.name,
            covered: court.covered,
            price: court.priceperhour
        });
        return acc;
    }, {});

    const facilitiesDetails = Object.entries(courtsBySport)
        .map(([sport, courts]) => {
            const courtDetails = courts.map(c => 
                `- ${c.name} (${c.covered ? 'acoperit' : 'în aer liber'}) - ${c.price} RON/oră`
            ).join('\n');
            return `${sport.toUpperCase()}:\n${courtDetails}`;
        })
        .join('\n\n');

        return `Ești asistentul virtual pentru ${info.name} din ${info.city}.

DESPRE LOCAȚIE:
${info.description}

SPORTURI DISPONIBILE:
${info.sports.map(s => s.sport.toUpperCase()).join(', ')}

PROGRAM DE FUNCȚIONARE:
${openDays}

FACILITĂȚI DISPONIBILE:
${facilitiesDetails}

CONTACT:
Telefon: ${info.phoneNumbers.join(', ')}
Adresă: ${info.address}

INSTRUCȚIUNI:
- Răspunde întotdeauna în limba română
- Oferă informații precise despre program, prețuri și facilități
- Ajută utilizatorii să aleagă terenul potrivit în funcție de preferințe
- Pentru rezervări, direcționează utilizatorii către sistemul de rezervări
- Păstrează un ton prietenos și profesionist
- Nu inventa informații care nu sunt furnizate mai sus

La întrebări despre:
1. Program - folosește exact orele specificate pentru fiecare zi
2. Prețuri - menționează prețul exact per oră pentru fiecare teren
3. Facilități - specifică dacă terenurile sunt acoperite sau în aer liber
4. Sporturi - menționează doar sporturile disponibile în listă`;
    }

    async addMessageToSession(sessionId, role, content) {
        const messageData = {
            role,
            content,
            timestamp: admin.firestore.Timestamp.now()
        };

        const sessionRef = this.firestore.collection('chatSessions').doc(sessionId);
        await sessionRef.update({
            messages: admin.firestore.FieldValue.arrayUnion(messageData)
        });
    }

    async getSessionHistory(sessionId) {
        const sessionDoc = await this.firestore.collection('chatSessions').doc(sessionId).get();
        if (!sessionDoc.exists) {
            throw new Error('Sesiunea nu există');
        }
        return sessionDoc.data().messages;
    }

    async processMessage(sessionId, message) {
        try {
            const sessionDoc = await this.firestore.collection('chatSessions').doc(sessionId).get();
            if (!sessionDoc.exists) {
                throw new Error('Sesiunea nu există');
            }

            const { locationId, messages } = sessionDoc.data();
            const systemPrompt = await this.generateSystemPrompt(locationId);

            const formattedMessages = [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({
                    role: m.role,
                    content: m.content
                })),
                { role: 'user', content: message }
            ];

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: formattedMessages,
                max_tokens: 500,
                temperature: 0.7
            });

            const assistantMessage = response.choices[0].message.content;
            await this.addMessageToSession(sessionId, 'user', message);
            await this.addMessageToSession(sessionId, 'assistant', assistantMessage);

            return {
                success: true,
                message: assistantMessage,
                sessionId
            };

        } catch (error) {
            console.error('Eroare în serviciul de chat:', error);
            throw error;
        }
    }
}

module.exports = { ChatService };
