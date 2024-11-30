// src/models/sportsModel.js
const db = require("../config/db");

async function getAllSports(cityId = null) {
    const sqlAllSports = `
        SELECT name
        FROM mod_dms_gen_sconn___sports;
    `;

    let sqlAvailableSports = `
        SELECT DISTINCT s.name
        FROM mod_dms_gen_sconn___sports s
        JOIN mod_dms_gen_sconn___courts c ON s.id = c.sport
        JOIN mod_dms_gen_sconn___locations l ON c.locationId = l.id
        WHERE l.valid = true
    `;

    const params = [];
    if (cityId) {
        sqlAvailableSports += ' AND l.cityId = $1';
        params.push(cityId);
    }

    const allSportsRows = await db.query(sqlAllSports);
    const availableSportsRows = await db.query(sqlAvailableSports, params);

    return {
        all_sports: allSportsRows.rows.map(row => row.name),
        available_sports: availableSportsRows.rows.map(row => row.name),
    };
}


module.exports = {
    getAllSports
};

  