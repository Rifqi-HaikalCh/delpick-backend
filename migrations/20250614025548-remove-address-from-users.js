'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('users', 'address');
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('users', 'address', {
            type: Sequelize.TEXT,
            allowNull: true
        });
    }
}; 