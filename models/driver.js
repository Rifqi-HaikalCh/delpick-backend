// 'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Driver extends Model {
    static associate(models) {
      // Relasi ke User
      Driver.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });

      // Relasi ke Order
      Driver.hasMany(models.Order, { foreignKey: 'driverId', as: 'orders' });

      // Relasi ke DriverReviews
      Driver.hasMany(models.DriverReview, { foreignKey: 'driverId', as: 'driverReviews' });
    }
  }
  Driver.init(
    {
      userId: DataTypes.INTEGER,
      vehicle_number: DataTypes.STRING,
      rating: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      reviewsCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'inactive',
      },
    },
    {
      sequelize,
      modelName: 'Driver',
    }
  );
  return Driver;
};