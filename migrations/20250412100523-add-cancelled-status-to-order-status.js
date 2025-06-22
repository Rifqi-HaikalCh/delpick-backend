'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // For MariaDB/MySQL, we can directly change from one enum to another
    await queryInterface.changeColumn('Orders', 'order_status', {
      type: Sequelize.ENUM(
        'pending',
        'approved',
        'preparing',
        'on_delivery',
        'delivered',
        'cancelled'
      ),
      allowNull: false,
      defaultValue: 'pending'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to the original enum values
    await queryInterface.changeColumn('Orders', 'order_status', {
      type: Sequelize.ENUM(
        'pending',
        'approved',
        'preparing',
        'on_delivery',
        'delivered'
      ),
      allowNull: false,
      defaultValue: 'pending'
    });
  }
};