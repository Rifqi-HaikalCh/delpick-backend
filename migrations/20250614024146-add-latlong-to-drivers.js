'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('drivers', 'latitude', {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: true
    });
    await queryInterface.addColumn('drivers', 'longitude', {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('drivers', 'latitude');
    await queryInterface.removeColumn('drivers', 'longitude');
  }
};
