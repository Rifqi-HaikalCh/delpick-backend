'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class OrderReview extends Model {
        static associate(models) {
            // Relasi ke Order
            OrderReview.belongsTo(models.Order, {
                foreignKey: 'order_id',
                as: 'order',
            });
            OrderReview.belongsTo(models.User, {
                foreignKey: 'customer_id',
                as: 'customer',
            });
        }
    }
    OrderReview.init(
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            order_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false
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
            modelName: 'OrderReview',
            tableName: 'order_reviews',
            timestamps: false
        }
    );
    return OrderReview;
};