'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('orders', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'stores',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      driver_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'drivers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      order_status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'on_delivery', 'delivered', 'cancelled'),
        defaultValue: 'pending'
      },
      delivery_status: {
        type: Sequelize.ENUM('pending', 'picked_up', 'on_way', 'delivered'),
        defaultValue: 'pending'
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      delivery_fee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      estimated_pickup_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      actual_pickup_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      estimated_delivery_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      actual_delivery_time: {
        type: Sequelize.DATE,
        allowNull: true
      },
      tracking_updates: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('orders', ['customer_id']);
    await queryInterface.addIndex('orders', ['store_id']);
    await queryInterface.addIndex('orders', ['driver_id']);
    await queryInterface.addIndex('orders', ['order_status']);
    await queryInterface.addIndex('orders', ['delivery_status']);

    // Tambah kolom fcm_token ke tabel users
    await queryInterface.addColumn('users', 'fcm_token', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'fcm_token');
    await queryInterface.dropTable('orders');
  }
};