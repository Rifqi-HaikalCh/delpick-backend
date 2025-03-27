'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class DriverReview extends Model {
        static associate(models) {
            // Relasi ke Driver
            DriverReview.belongsTo(models.Driver, {
                foreignKey: 'driverId',
                as: 'driver',
            });

            // Relasi ke User (customer yang memberikan review)
            DriverReview.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'user',
            });
        }
    }
    DriverReview.init(
        {
            driverId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            userId: {
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
        },
        {
            sequelize,
            modelName: 'DriverReview',
        }
    );
    return DriverReview;
};