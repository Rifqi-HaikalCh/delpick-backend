'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class OrderItem extends Model {
    static associate(models) {
      // Relasi ke Store
      OrderItem.belongsTo(models.Store, { foreignKey: 'storeId', as: 'store' });
    }
  }
  OrderItem.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      name: DataTypes.STRING,
      description: DataTypes.STRING,
      price: DataTypes.DOUBLE,
      quantity: DataTypes.INTEGER,
      imageUrl: DataTypes.STRING,
      status: DataTypes.STRING,
      storeId: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'OrderItem',
    }
  );
  return OrderItem;
};