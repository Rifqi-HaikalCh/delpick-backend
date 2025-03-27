'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      // Relasi ke Item (Order contains Items)
      Order.hasMany(models.OrderItem, { foreignKey: 'orderId', as: 'items' });

      // Relasi ke Store
      Order.belongsTo(models.Store, { foreignKey: 'storeId', as: 'store' });

      // Relasi ke User (Customer)
      Order.belongsTo(models.User, { foreignKey: 'customerId', as: 'customer' });

      // Relasi ke User (Driver)
      Order.belongsTo(models.User, { foreignKey: 'driverId', as: 'driver' });

      // Relasi ke DriverRequest
      Order.hasMany(models.DriverRequest, { foreignKey: 'orderId', as: 'driverRequests' });

      // Relasi ke OrderReviews
      Order.hasMany(models.OrderReview, { foreignKey: 'orderId', as: 'orderReviews' });
    }
  }
  Order.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      deliveryAddress: DataTypes.STRING,
      subtotal: DataTypes.DOUBLE,
      serviceCharge: DataTypes.DOUBLE,
      total: DataTypes.DOUBLE,
      order_status: {
        type: DataTypes.ENUM('pending', 'approved', 'preparing', 'on_delivery', 'delivered'),
        defaultValue: 'pending', // Default status pending
      },
      delivery_status: {
        type: DataTypes.ENUM('waiting', 'picking_up', 'on_delivery', 'delivered'),
        defaultValue: 'waiting', // Default status waiting
      },
      orderDate: DataTypes.DATE,
      notes: DataTypes.STRING,
      customerId: DataTypes.INTEGER,
      driverId: DataTypes.INTEGER,
      storeId: DataTypes.INTEGER, // Perbaiki tipe data dari STRING ke INTEGER
    },
    {
      sequelize,
      modelName: 'Order',
    }
  );
  return Order;
};