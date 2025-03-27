'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class DriverRequest extends Model {
        static associate(models) {
            // Relasi ke Order
            DriverRequest.belongsTo(models.Order, {
                foreignKey: 'orderId',
                as: 'order',
            });

            // Relasi ke User (Driver)
            DriverRequest.belongsTo(models.User, {
                foreignKey: 'driverId',
                as: 'driver',
            });
        }
    }

    DriverRequest.init(
        {
            orderId: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            driverId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            status: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: 'pending', // Status: pending, accepted, rejected
            },
        },
        {
            sequelize,
            modelName: 'DriverRequest',
        }
    );

    return DriverRequest;
};