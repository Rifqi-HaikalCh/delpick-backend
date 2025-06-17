'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class DriverReview extends Model {
        static associate(models) {
            // Relasi ke Driver
            DriverReview.belongsTo(models.Driver, {
                foreignKey: 'driver_id',
                as: 'driver',
            });

            // Relasi ke User (customer yang memberikan review)
            DriverReview.belongsTo(models.User, {
                foreignKey: 'customer_id',
                as: 'customer',
            });

            // Relasi ke Order
            DriverReview.belongsTo(models.Order, {
                foreignKey: 'order_id',
                as: 'order',
            });
        }
    }
    DriverReview.init(
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            order_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            driver_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            rating: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: 1,
                    max: 5,
                },
            },
            comment: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            is_auto_generated: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
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
            modelName: 'DriverReview',
            tableName: 'driver_reviews',
            timestamps: false
        }
    );
    return DriverReview;
};