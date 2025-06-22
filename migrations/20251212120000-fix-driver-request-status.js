'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Change the status column to ENUM
        await queryInterface.changeColumn('DriverRequests', 'status', {
            type: Sequelize.ENUM('pending', 'accepted', 'rejected', 'expired'),
            allowNull: false,
            defaultValue: 'pending',
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Revert back to STRING
        await queryInterface.changeColumn('DriverRequests', 'status', {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'pending',
        });
    },
}; 