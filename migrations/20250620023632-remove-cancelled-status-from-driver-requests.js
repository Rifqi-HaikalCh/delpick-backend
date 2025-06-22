'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, remove the ENUM constraint
    await queryInterface.sequelize.query('ALTER TABLE driver_requests MODIFY COLUMN status VARCHAR(255);');

    // Then, update the ENUM type to remove 'cancelled'
    await queryInterface.sequelize.query("ALTER TABLE driver_requests MODIFY COLUMN status ENUM('pending', 'accepted', 'rejected', 'completed', 'expired') DEFAULT 'pending';");
  },

  async down(queryInterface, Sequelize) {
    // First, remove the ENUM constraint
    await queryInterface.sequelize.query('ALTER TABLE driver_requests MODIFY COLUMN status VARCHAR(255);');

    // Then, add back 'cancelled' to the ENUM
    await queryInterface.sequelize.query("ALTER TABLE driver_requests MODIFY COLUMN status ENUM('pending', 'accepted', 'rejected', 'completed', 'expired', 'cancelled') DEFAULT 'pending';");
  }
};
