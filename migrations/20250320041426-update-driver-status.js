'use strict';

module.exports = {
    up: async (queryInterface) => {
        // First, update existing 'busy' statuses to 'active'
        await queryInterface.sequelize.query(
            `UPDATE "Drivers" SET status = 'active' WHERE status = 'busy'`
        );

        // Then modify the enum type
        await queryInterface.sequelize.query(
            `ALTER TYPE "enum_Drivers_status" ADD VALUE IF NOT EXISTS 'busy'`
        );
    },

    down: async (queryInterface) => {
        await queryInterface.sequelize.query(
            `UPDATE "Drivers" SET status = 'active' WHERE status = 'busy'`
        );
    }
}; 