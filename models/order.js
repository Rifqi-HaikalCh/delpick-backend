'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      // Relasi ke Item (Order contains Items)
      Order.hasMany(models.OrderItem, { foreignKey: 'order_id', as: 'items' });

      // Relasi ke Store
      Order.belongsTo(models.Store, { foreignKey: 'store_id', as: 'store' });

      // Relasi ke User (Customer)
      Order.belongsTo(models.User, { foreignKey: 'customer_id', as: 'customer' });

      // Relasi ke User (Driver)
      Order.belongsTo(models.Driver, { foreignKey: 'driver_id', as: 'driver' });

      // Relasi ke DriverRequest
      Order.hasMany(models.DriverRequest, { foreignKey: 'order_id', as: 'driverRequests' });

      // Relasi ke OrderReviews
      Order.hasMany(models.OrderReview, { foreignKey: 'order_id', as: 'orderReviews' });

      // Relasi ke DriverReviews
      Order.hasMany(models.DriverReview, { foreignKey: 'order_id', as: 'driverReviews' });
    }
  }
  Order.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      store_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      driver_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      order_status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'on_delivery', 'delivered', 'cancelled', 'rejected'),
        defaultValue: 'pending'
      },
      delivery_status: {
        type: DataTypes.ENUM('pending', 'picked_up', 'on_way', 'delivered'),
        defaultValue: 'pending'
      },
      total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      delivery_fee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      estimated_pickup_time: {
        type: DataTypes.DATE,
        allowNull: true
      },
      actual_pickup_time: {
        type: DataTypes.DATE,
        allowNull: true
      },
      estimated_delivery_time: {
        type: DataTypes.DATE,
        allowNull: true
      },
      actual_delivery_time: {
        type: DataTypes.DATE,
        allowNull: true
      },
      tracking_updates: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'Order',
      tableName: 'orders',
      timestamps: false
    }
  );
  return Order;
};