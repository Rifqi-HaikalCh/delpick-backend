'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('order_items', 'name', {
      type: Sequelize.STRING,
      allowNull: false
    });
    await queryInterface.addColumn('order_items', 'description', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('order_items', 'image_url', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('order_items', 'category', {
      type: Sequelize.STRING,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('order_items', 'name');
    await queryInterface.removeColumn('order_items', 'description');
    await queryInterface.removeColumn('order_items', 'image_url');
    await queryInterface.removeColumn('order_items', 'category');
  }
};
