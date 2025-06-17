'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('stores', 'opening_hours');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('stores', 'opening_hours', {
      type: Sequelize.JSON,
      allowNull: true
    });
  }
};
