const { Op } = require('sequelize');

/**
 * Membuat query options untuk pagination, filtering, dan sorting
 * @param {Object} queryParams - Query parameters dari request (req.query)
 * @param {Array} includeModels - Daftar model yang ingin di-include dalam query (opsional)
 * @returns {Object} - Query options untuk Sequelize
 */
const getQueryOptions = (queryParams, includeModels = []) => {
    const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'ASC', search, ...filters } = queryParams;

    // Pagination
    const offset = (page - 1) * limit;

    // Sorting
    const order = [[sortBy, sortOrder.toUpperCase()]];

    // Filtering
    const where = {};
    for (const key in filters) {
        if (filters[key]) {
            where[key] = { [Op.eq]: filters[key] }; // Gunakan operator EQ untuk filtering eksak
        }
    }

    // Search (jika ada parameter search)
    if (search) {
        where.name = { [Op.like]: `%${search}%` }; // Menggunakan LIKE untuk pencarian fleksibel
    }

    return {
        where,
        order,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: includeModels, // Menambahkan include jika ada
    };
};

module.exports = {
    getQueryOptions,
};
