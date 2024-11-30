// src/models/courtModel.js
const db = require("../config/db");

async function addCourt(data) {
    const result = await db.query(
        `INSERT INTO mod_dms_gen_sconn___courts 
         (locationId, name, sport, covered, cityId, pricePerHour)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [data.locationId, data.name, data.sport, data.covered, data.cityId, data.pricePerHour]
    );
    return result.rows[0]?.id || null;
}

async function updateCourtProperties(courtId, properties) {
    const allowedProperties = ['name', 'covered', 'pricePerHour', 'inactiv'];
    const result = {
        updatedProperties: [],
        errors: []
    };

    for (const [property, value] of Object.entries(properties)) {
        if (!allowedProperties.includes(property)) {
            result.errors.push(`Proprietatea ${property} nu este permisă pentru actualizare.`);
            continue;
        }

        let processedValue = value;
        if (property === 'covered' || property === 'inactiv') {
            processedValue = value ? true : false;
        } else if (property === 'pricePerHour') {
            processedValue = parseFloat(value);
            if (isNaN(processedValue)) {
                result.errors.push(`Valoare invalidă pentru pricePerHour: ${value}`);
                continue;
            }
        }

        try {
            const updateResult = await db.query(
                `UPDATE mod_dms_gen_sconn___courts 
                 SET ${property} = $1 
                 WHERE id = $2 
                 RETURNING id`,
                [processedValue, courtId]
            );

            if (updateResult.rows.length > 0) {
                result.updatedProperties.push(property);
            } else {
                result.errors.push(`Eroare la actualizarea proprietății ${property}.`);
            }
        } catch (error) {
            result.errors.push(`Eroare la actualizarea proprietății ${property}: ${error.message}`);
        }
    }

    return result;
}

async function isCourtBelongToLocation(courtId, locationId) {
    try {
        const result = await db.query(
            `SELECT COUNT(*) as count 
             FROM mod_dms_gen_sconn___courts 
             WHERE id = $1 AND locationId = $2`,
            [courtId, locationId]
        );
        return parseInt(result.rows[0].count) > 0;
    } catch (error) {
        console.error("Error in isCourtBelongToLocation:", error);
        throw error;
    }
}


async function getCourtsByDayCitySport(cityId, sportId, dayOfWeek) {
    const sql = `
        SELECT 
            c.id AS "courtId",
            c.name AS "courtName",
            s.name AS "sportName",
            l.id AS "locationId",
            l.name AS "locationName",
            ls.orastart,
            ls.oraend
        FROM 
            mod_dms_gen_sconn___courts c
        JOIN 
            mod_dms_gen_sconn___locations l ON c.locationId = l.id
        JOIN 
            mod_dms_gen_sconn___sports s ON c.sport = s.id
        JOIN 
            mod_dms_gen_sconn___location_schedules ls ON l.id = ls.locationid
        WHERE 
            l.cityId = $1
            AND c.sport = $2 
            AND ls.dayofweek = $3
            AND ls.isopen = true
            AND l.valid = true
        ORDER BY 
            l.name, c.name`;

    try {
        const result = await db.query(sql, [cityId, sportId, dayOfWeek]);
        
        return {
            success: true,
            count: result.rows.length,
            courts: result.rows
        };
    } catch (error) {
        console.error("Error in getCourtsByDayCitySport:", error);
        throw error;
    }
}



module.exports = {
    addCourt,
    updateCourtProperties,
    isCourtBelongToLocation,
    getCourtsByDayCitySport
};
