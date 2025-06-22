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
      Store.belongsTo(models.User, { foreignKey: 'user_id', as: 'owner' });

      // Relasi dengan MenuItems
      Store.hasMany(models.MenuItem, { foreignKey: 'store_id', as: 'menu_items' });
    }
  }
  Store.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    open_time: DataTypes.TIME,
    close_time: DataTypes.TIME,
    rating: DataTypes.FLOAT,
    total_products: DataTypes.INTEGER,
    image_url: DataTypes.STRING,
    phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    review_count: DataTypes.INTEGER,
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false
    },
    distance: DataTypes.FLOAT,
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'closed'),
      defaultValue: 'active'
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
  }, {
    sequelize,
    modelName: 'Store',
    tableName: 'stores',
    timestamps: false
  });
  return Store;
};