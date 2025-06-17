'use strict';

module.exports = {
  up: async (queryInterface) => {
    // Tambahkan data admin ke tabel Users
    await queryInterface.bulkInsert('users', [
      {
        name: 'Admin',
        email: 'admin@delpick.com',
        phone: '081234567890',
        password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // Password: "password"
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface) => {
    // Hapus data admin dari tabel Users
    await queryInterface.bulkDelete('users', { email: 'admin@delpick.com' });
  },
};