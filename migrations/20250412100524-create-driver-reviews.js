'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('driver_reviews', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            order_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'orders',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            driver_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'drivers',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            customer_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            rating: {
                type: Sequelize.INTEGER,
                allowNull: false,
                validate: {
                    min: 1,
                    max: 5
                }
            },
            comment: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            is_auto_generated: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // Add indexes
        await queryInterface.addIndex('driver_reviews', ['order_id']);
        await queryInterface.addIndex('driver_reviews', ['driver_id']);
        await queryInterface.addIndex('driver_reviews', ['customer_id']);
        await queryInterface.addIndex('driver_reviews', ['rating']);
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('driver_reviews');
    }
}; 