'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Drivers', 'latitude', {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: true,
    });
    await queryInterface.addColumn('Drivers', 'longitude', {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: true,
    });
    await queryInterface.addColumn('Drivers', 'status', {
      type: Sequelize.ENUM('active', 'inactive'),
      defaultValue: 'inactive',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Drivers', 'latitude');
    await queryInterface.removeColumn('Drivers', 'longitude');
    await queryInterface.removeColumn('Drivers', 'status');
  },
};