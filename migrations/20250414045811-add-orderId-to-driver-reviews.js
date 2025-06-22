'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('DriverReviews', 'orderId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Orders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // Tambahkan index untuk meningkatkan performa query
    await queryInterface.addIndex('DriverReviews', ['orderId']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('DriverReviews', 'orderId');
  }
};