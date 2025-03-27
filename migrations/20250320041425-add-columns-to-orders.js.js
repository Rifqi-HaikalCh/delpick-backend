'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Orders', 'status');
    await queryInterface.addColumn('Orders', 'order_status', {
      type: Sequelize.ENUM('pending', 'approved', 'preparing', 'on_delivery', 'delivered'),
      defaultValue: 'pending',
    });
    await queryInterface.addColumn('Orders', 'delivery_status', {
      type: Sequelize.ENUM('waiting', 'picking_up', 'on_delivery', 'delivered'),
      defaultValue: 'waiting',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Orders', 'order_status');
    await queryInterface.removeColumn('Orders', 'delivery_status');
    await queryInterface.addColumn('Orders', 'status', {
      type: Sequelize.ENUM('pending', 'approved', 'preparing', 'on_delivery', 'delivered'),
      defaultValue: 'pending',
    });
  },
};