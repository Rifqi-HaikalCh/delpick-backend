'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('drivers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      license_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      vehicle_plate: {
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'busy'),
        defaultValue: 'active'
      },
      rating: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 5.00
      },
      reviews_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      created_at: {
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        type: Sequelize.DATE
      }
    });

    // Add indexes
    await queryInterface.addIndex('drivers', ['user_id']);
    await queryInterface.addIndex('drivers', ['status']);
    await queryInterface.addIndex('drivers', ['rating']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('drivers');
  }
};