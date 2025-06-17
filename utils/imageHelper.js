const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

/**
 * Menyimpan base64 sebagai file gambar
 * @param {string} base64String - String base64 dari gambar
 * @param {string} folder - Folder tempat menyimpan gambar (contoh: 'stores', 'menu-items')
 * @param {string} prefix - Prefix nama file (contoh: 'store_', 'menu_')
 * @returns {string} - Path file gambar yang disimpan
 */
const saveBase64Image = (base64String, folder, prefix) => {
    try {
        // Buat direktori jika belum ada
        const uploadDir = path.join(__dirname, `../uploads/${folder}`);
        // Cek path folder
        logger.info("Upload directory:", uploadDir);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Ambil tipe file dari base64
        const matches = base64String.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
        if (!matches) {
            throw new Error('Format gambar tidak valid');
        }

        const extension = matches[1]; // jpg, png, dll.
        const imageBuffer = Buffer.from(matches[2], 'base64');
        const fileName = `${prefix}_${Date.now()}.${extension}`; // Nama file unik
        const filePath = path.join(uploadDir, fileName);
        logger.info("Saving image to:", filePath);  // Cek path file yang digunakan

        // Simpan file
        fs.writeFileSync(filePath, imageBuffer);

        // Kembalikan path relatif (untuk disimpan di database)
        return `/uploads/${folder}/${fileName}`;
    } catch (error) {
        throw new Error('Gagal menyimpan gambar: ' + error.message);
    }
};

module.exports = { saveBase64Image };