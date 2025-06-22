'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, remove the ENUM constraint
    await queryInterface.sequelize.query('ALTER TABLE orders MODIFY COLUMN order_status VARCHAR(255);');

    // Then, update the ENUM type to include 'rejected'
    await queryInterface.sequelize.query("ALTER TABLE orders MODIFY COLUMN order_status ENUM('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'on_delivery', 'delivered', 'cancelled', 'rejected') DEFAULT 'pending';");
  },

  down: async (queryInterface, Sequelize) => {
    // First, remove the ENUM constraint
    await queryInterface.sequelize.query('ALTER TABLE orders MODIFY COLUMN order_status VARCHAR(255);');

    // Then, revert back to the original ENUM without 'rejected'
    await queryInterface.sequelize.query("ALTER TABLE orders MODIFY COLUMN order_status ENUM('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'on_delivery', 'delivered', 'cancelled') DEFAULT 'pending';");
  }
};
