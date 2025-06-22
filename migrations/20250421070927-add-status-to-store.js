'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Stores', 'status', {
      type: Sequelize.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Stores', 'status');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Stores_status";');
  }
};