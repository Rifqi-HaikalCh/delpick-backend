'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Store extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Relasi dengan User
      Store.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });

      // Relasi dengan MenuItems
      Store.hasMany(models.MenuItem, { foreignKey: 'storeId' });
    }
  }
  Store.init({
    userId: DataTypes.INTEGER,
    name: DataTypes.STRING,
    address: DataTypes.TEXT,
    description: DataTypes.TEXT,
    openTime: DataTypes.TIME,
    closeTime: DataTypes.TIME,
    rating: DataTypes.FLOAT,
    totalProducts: DataTypes.INTEGER,
    imageUrl: DataTypes.STRING,
    phone: DataTypes.STRING,
    reviewCount: DataTypes.INTEGER,
    latitude: DataTypes.FLOAT,
    longitude: DataTypes.FLOAT,
    distance: DataTypes.FLOAT
  }, {
    sequelize,
    modelName: 'Store',
    timestamps : true,
  });
  return Store;
};