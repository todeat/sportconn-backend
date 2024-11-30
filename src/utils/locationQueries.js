
const db = require("../config/db");

async function getAllLocationInfo(locationId) {
    try {
        // Verificăm dacă locationId este valid
        if (!locationId) {
            throw new Error("LocationId este obligatoriu");
        }

        const validationCheck = await db.query(
            `SELECT valid 
             FROM mod_dms_gen_sconn___locations 
             WHERE id = $1`,
            [locationId]
        );

        if (validationCheck.rows.length === 0 || !validationCheck.rows[0].valid) {
            return null;
        }

        // Obținem informațiile de bază despre locație
        const locationInfo = await getLocationBasicInfo(locationId);
        if (!locationInfo) {
            throw new Error("Nu s-au găsit informații pentru această locație");
        }

        // Obținem numerele de telefon
        const phoneNumbers = await getLocationPhoneNumbers(locationId);

        // Obținem informațiile despre terenuri
        const courts = await getLocationCourts(locationId);

        const sports = await getLocationSports(locationId);

        // Obținem programul locației
        const scheduleResult = await getLocationTimeSchedule(locationId);
        if (!scheduleResult.success) {
            throw new Error("Nu s-a putut obține programul locației");
        }
        const schedule = scheduleResult.schedule;

        // Construim și returnăm răspunsul
        return {
            success: true,
            locationInfo: {
                id: locationInfo.id,
                name: locationInfo.name,
                description: locationInfo.description,
                city: locationInfo.cityname,
                address: locationInfo.address,
                oraStart: locationInfo.orastart,
                oraEnd: locationInfo.oraend,
                phoneNumbers,
                courts,
                sports,
                schedule // Adăugăm programul locației
            }
        };

    } catch (error) {
        console.error("Error in getLocationInfo:", error);
        throw error;
    }
}

async function getLocationSports(locationId) {
    const result = await db.query(
        `SELECT DISTINCT s.id as sportId, s.name as sport
            FROM mod_dms_gen_sconn___courts c
            JOIN mod_dms_gen_sconn___sports s ON c.sport = s.id
            WHERE c.locationId = $1
            ORDER BY s.name`,
        [locationId]
    );
    return result.rows;
}


async function getLocationBasicInfo(locationId) {
    const result = await db.query(
        `SELECT 
            l.id, l.name, l.description, l.address,
            c.name AS cityName
        FROM 
            mod_dms_gen_sconn___locations l
        JOIN 
            mod_dms_gen_sconn___cities c ON l.cityId = c.id
        WHERE 
            l.id = $1`,
        [locationId]
    );
    return result.rows[0];
}


async function getLocationPhoneNumbers(locationId) {
    const result = await db.query(
        `SELECT DISTINCT phoneNumber
         FROM mod_dms_gen_sconn___admin_locations
         WHERE locationId = $1`,
        [locationId]
    );
    return result.rows.map(row => row.phonenumber);
}

async function getLocationCourts(locationId) {
    const result = await db.query(
        `SELECT 
            s.name AS sport,
            c.name,
            c.covered,
            c.pricePerHour,
            c.id AS courtId
        FROM 
            mod_dms_gen_sconn___courts c
        JOIN 
            mod_dms_gen_sconn___sports s ON c.sport = s.id
        WHERE 
            c.locationId = $1
        GROUP BY 
            s.name, c.name, c.covered, c.pricePerHour, c.id`,
        [locationId]
    );
    return result.rows;
}

async function getLocationTimeSchedule(locationId) {
    try {
        const query = `
            SELECT dayofweek, orastart, oraend, isopen
            FROM mod_dms_gen_sconn___location_schedules
            WHERE locationid = $1
            ORDER BY dayofweek;
        `;
        const result = await db.query(query, [locationId]);

        if (result.rows.length === 0) {
            return { success: false, message: 'No schedule found for the given locationId' };
        }

        // Organizăm programul într-un format util, grupat pe zilele săptămânii
        const schedule = result.rows.map(row => ({
            dayOfWeek: row.dayofweek,
            oraStart: row.orastart,
            oraEnd: row.oraend,
            isOpen: row.isopen
        }));

        return { success: true, schedule };
    } catch (error) {
        console.error('Error fetching location schedule:', error);
        return { success: false, message: 'An error occurred while fetching the schedule', error };
    }
}

module.exports = {
    getAllLocationInfo
};