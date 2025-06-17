'use strict';
const { Model } = require('sequelize');
require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Driver extends Model {
    static associate(models) {
      // Relasi ke User
      Driver.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });

      // Relasi ke Order
      Driver.hasMany(models.Order, { foreignKey: 'driver_id', as: 'orders' });

      // Relasi ke DriverReviews
      Driver.hasMany(models.DriverReview, { foreignKey: 'driver_id', as: 'driverReviews' });

      // Relasi ke DriverRequests
      Driver.hasMany(models.DriverRequest, { foreignKey: 'driver_id', as: 'driverRequests' });
    }
  }

  Driver.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    license_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    vehicle_plate: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'busy'),
      defaultValue: 'active'
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 5.00
    },
    reviews_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
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
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Driver',
    tableName: 'drivers',
    timestamps: false
  });

  return Driver;
};