'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Relasi dengan Store
      User.hasOne(models.Store, { foreignKey: 'userId' });

      // Relasi dengan Orders (Customer)
      User.hasMany(models.Order, { foreignKey: 'customerId' });

      // Relasi dengan Driver
      User.hasOne(models.Driver, { foreignKey: 'userId' });
    }
  }
  User.init({
    name: DataTypes.STRING,
    phone: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    role: DataTypes.ENUM('customer', 'store', 'driver', 'admin'),
    avatar: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};