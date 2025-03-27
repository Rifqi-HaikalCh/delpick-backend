'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class OrderReview extends Model {
        static associate(models) {
            // Relasi ke Order
            OrderReview.belongsTo(models.Order, {
                foreignKey: 'orderId',
                as: 'order',
            });
        }
    }
    OrderReview.init(
        {
            orderId: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true, // Pastikan satu order hanya memiliki satu review
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
            modelName: 'OrderReview',
        }
    );
    return OrderReview;
};