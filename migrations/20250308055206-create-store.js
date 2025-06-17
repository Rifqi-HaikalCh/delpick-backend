'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stores', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      open_time: {
        type: Sequelize.TIME
      },
      close_time: {
        type: Sequelize.TIME
      },
      rating: {
        type: Sequelize.FLOAT
      },
      total_products: {
        type: Sequelize.INTEGER
      },
      image_url: {
        type: Sequelize.STRING
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false
      },
      review_count: {
        type: Sequelize.INTEGER
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false
      },
      longitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false
      },
      distance: {
        type: Sequelize.FLOAT
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'closed'),
        defaultValue: 'active'
      },
      opening_hours: {
        type: Sequelize.JSON,
        allowNull: true
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
    await queryInterface.addIndex('stores', ['user_id']);
    await queryInterface.addIndex('stores', ['status']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('stores');
  }
};