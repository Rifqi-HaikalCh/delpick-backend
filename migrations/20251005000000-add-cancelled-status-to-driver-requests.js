'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // First, remove the ENUM constraint
        await queryInterface.sequelize.query('ALTER TABLE driver_requests MODIFY COLUMN status VARCHAR(255);');

        // Then, update the ENUM type to include 'cancelled'
        await queryInterface.sequelize.query("ALTER TABLE driver_requests MODIFY COLUMN status ENUM('pending', 'accepted', 'rejected', 'completed', 'expired', 'cancelled') DEFAULT 'pending';");
    },

    down: async (queryInterface, Sequelize) => {
        // First, remove the ENUM constraint
        await queryInterface.sequelize.query('ALTER TABLE driver_requests MODIFY COLUMN status VARCHAR(255);');

        // Then, revert back to the previous ENUM without 'cancelled'
        await queryInterface.sequelize.query("ALTER TABLE driver_requests MODIFY COLUMN status ENUM('pending', 'accepted', 'rejected', 'completed', 'expired') DEFAULT 'pending';");
    }
}; 