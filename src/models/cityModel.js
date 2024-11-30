// src/models/citiesModel.js

const db = require("../config/db");

async function getAllCities() {
    const sqlAllCities = `
        SELECT name
        FROM mod_dms_gen_sconn___cities;
    `;

    const sqlAvailableCities = `
        SELECT DISTINCT c.name
        FROM mod_dms_gen_sconn___cities c
        JOIN mod_dms_gen_sconn___locations l ON c.id = l.cityId
        WHERE l.valid = true;
    `;

    const allCitiesRows = await db.query(sqlAllCities);
    const availableCitiesRows = await db.query(sqlAvailableCities);

    return {
        all_cities: allCitiesRows.rows.map(row => row.name),
        available_cities: availableCitiesRows.rows.map(row => row.name),
    };
}


module.exports = {
    getAllCities
};
