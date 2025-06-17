'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class DriverRequest extends Model {
        static associate(models) {
            // Relasi ke Order
            DriverRequest.belongsTo(models.Order, {
                foreignKey: 'order_id',
                as: 'order',
            });

            // Relasi ke Driver
            DriverRequest.belongsTo(models.Driver, {
                foreignKey: 'driver_id',
                as: 'driver',
            });
        }
    }

    DriverRequest.init(
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
            status: {
                type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'completed', 'expired'),
                allowNull: false,
                defaultValue: 'pending', // Status: pending, accepted, rejected, completed, expired
            },
            estimated_pickup_time: {
                type: DataTypes.DATE,
                allowNull: true
            },
            estimated_delivery_time: {
                type: DataTypes.DATE,
                allowNull: true
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
            modelName: 'DriverRequest',
            tableName: 'driver_requests',
            timestamps: false
        }
    );

    return DriverRequest;
};