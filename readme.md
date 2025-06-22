# Del-Pick API

API untuk aplikasi Del-Pick, sebuah platform food delivery. API ini mencakup fitur autentikasi, manajemen store, driver, customer, order, dan tracking.

---

## **Daftar Isi**

1. [Persiapan](#persiapan)
2. [Instalasi](#instalasi)
3. [Konfigurasi Database](#konfigurasi-database)
4. [Menjalankan Migration](#menjalankan-migration)
5. [Menjalankan Seeder](#menjalankan-seeder)
6. [Menjalankan Server](#menjalankan-server)
7. [Mengakses API dengan Swagger UI](#mengakses-api-dengan-swagger-ui)
8. [Endpoint API](#endpoint-api)
9. [Struktur Folder](#struktur-folder)

---

## **Persiapan**

Sebelum memulai, pastikan Anda telah menginstal:

- [Node.js](https://nodejs.org/) (versi 16 atau lebih baru)
- [MySQL](https://www.mysql.com/) (atau database lain yang didukung Sequelize)
- [Git](https://git-scm.com/) (opsional)

---

## **Instalasi**

1. Clone repository ini:

   ```bash
   git clone https://github.com/username/del-pick-api.git
   cd del-pick-api
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Buat file `.env` di root folder dan isi dengan konfigurasi berikut:

   ```env
   NODE_ENV=development
   PORT=5000
   DB_USERNAME=your_db_username
   DB_PASSWORD=your_db_password
   DB_NAME=delpick
   DB_HOST=localhost
   DB_PORT=3306
   JWT_SECRET=your_jwt_secret
   ```

   Ganti nilai `your_db_username`, `your_db_password`, dan `your_jwt_secret` dengan nilai yang sesuai.

---

## **Konfigurasi Database**

1. Buat database baru di MySQL dengan nama `delpick` (atau sesuaikan dengan nilai `DB_NAME` di `.env`).

2. Pastikan koneksi database berhasil dengan menguji koneksi menggunakan Sequelize CLI:

   ```bash
   npx sequelize-cli db:migrate:status
   ```

   Jika berhasil, Anda akan melihat daftar migration yang belum dijalankan.

---

## **Menjalankan Migration**

Jalankan migration untuk membuat tabel-tabel di database:

```bash
npx sequelize-cli db:migrate
```

Untuk mengembalikan (undo) migration:

```bash
npx sequelize-cli db:migrate:undo
```

---

## **Menjalankan Seeder**

1. Jalankan seeder untuk menambahkan data awal (contoh: admin):

   ```bash
   npx sequelize-cli db:seed:all
   ```

2. Untuk mengembalikan (undo) seeder:

   ```bash
   npx sequelize-cli db:seed:undo
   ```

---

## **Menjalankan Server**

Jalankan server dengan perintah berikut:

```bash
npm start
```

Server akan berjalan di `http://localhost:5000`.

---

## **Mengakses API dengan Swagger UI**

1. Setelah server berjalan, buka browser dan akses:

   ```
   http://localhost:5000/api-docs
   ```

2. Anda akan melihat dokumentasi API lengkap dengan Swagger UI.

3. Gunakan fitur "Try it out" untuk menguji endpoint API.

---

## **Endpoint API**

Berikut adalah daftar endpoint utama:

### **Authentication**
- `POST /auth/register` - Mendaftarkan user baru.
- `POST /auth/login` - Login user.
- `POST /auth/logout` - Logout user.
- `POST /auth/forgot-password` - Mengirim email reset password.
- `POST /auth/reset-password` - Reset password dengan token.
- `PUT /auth/update-profile` - Memperbarui profil user.

### **Stores**
- `GET /stores` - Mendapatkan semua store.
- `POST /stores` - Membuat store baru.
- `GET /stores/{id}` - Mendapatkan store berdasarkan ID.
- `PUT /stores/{id}` - Mengupdate store berdasarkan ID.
- `DELETE /stores/{id}` - Menghapus store berdasarkan ID.
- `PUT /stores/me` - Mengupdate store oleh owner yang sedang login.

### **Drivers**
- `GET /drivers` - Mendapatkan semua driver.
- `POST /drivers` - Membuat driver baru.
- `GET /drivers/{id}` - Mendapatkan driver berdasarkan ID.
- `PUT /drivers/{id}` - Mengupdate driver berdasarkan ID.
- `DELETE /drivers/{id}` - Menghapus driver berdasarkan ID.
- `PUT /drivers/location` - Mengupdate lokasi driver secara realtime.
- `PUT /drivers/status` - Mengupdate status driver (active/inactive).
- `PUT /drivers/me` - Mengupdate data driver oleh driver yang sedang login.

### **Orders**
- `GET /orders/user` - Mendapatkan semua order berdasarkan user yang sedang login (customer).
- `GET /orders/store` - Mendapatkan semua order berdasarkan store yang dimiliki oleh owner yang sedang login.
- `POST /orders` - Membuat order baru.
- `PUT /orders/{orderId}/approve` - Meng-approve order oleh toko.
- `GET /orders/{id}` - Mendapatkan detail order berdasarkan ID.
- `POST /orders/review` - Membuat review untuk store atau driver.

### **Tracking**
- `PUT /tracking/driver-requests/{orderId}/accept` - Driver menyetujui permintaan pengantaran.
- `GET /tracking/{orderId}` - Mendapatkan data tracking secara realtime.

### **Push Notifications (FCM)**
- `PUT /api/v1/users/fcm-token` - Update FCM token.
- `PUT /api/v1/users/profile` - Update profile (termasuk FCM token).

---

## **Struktur Folder**

```
del-pick-api/
├── config/               # Konfigurasi database
├── controllers/          # Logic controller
├── migrations/           # File migration
├── models/               # Model Sequelize
├── routes/               # Definisi route
├── seeders/              # File seeder
├── utils/                # Utility functions
├── validators/           # Validasi request
├── app.js                # Entry point aplikasi
├── swagger.yaml          # Dokumentasi API
├── .env                  # Environment variables
├── .gitignore            # File yang diabaikan oleh Git
├── package.json          # Dependencies dan scripts
└── README.md             # Dokumentasi proyek
```

---

## **Lisensi**

Proyek ini dilisensikan di bawah [MIT License](LICENSE).

## **FCM Token Management**

Aplikasi ini mendukung Firebase Cloud Messaging (FCM) untuk push notifications. Setiap user dapat menyimpan FCM token untuk menerima notifikasi real-time.

### **FCM Token Endpoints**

#### **Update FCM Token**
```http
PUT /api/v1/users/fcm-token
Authorization: Bearer <token>
Content-Type: application/json

{
    "fcm_token": "your-fcm-token-here"
}
```

#### **Update Profile (termasuk FCM Token)**
```http
PUT /api/v1/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "User Name",
    "email": "user@example.com",
    "phone": "08123456789",
    "fcm_token": "your-fcm-token-here"
}
```

### **FCM Token Features**

1. **Token Validation**: Sistem memvalidasi format FCM token sebelum menyimpan
2. **Token Cleanup**: Fungsi untuk membersihkan token yang tidak valid atau expired
3. **Automatic Notifications**: Sistem secara otomatis mengirim notifikasi untuk:
   - Order status updates
   - Driver request notifications
   - Delivery completion
   - Order cancellations

### **Notification Types**

- **Order Notifications**: Dikirim ke customer saat status order berubah
- **Driver Notifications**: Dikirim ke driver saat ada request baru atau order dibatalkan
- **Store Notifications**: Dikirim ke store owner untuk update order

### **Usage Example**

```javascript
// Update FCM token after user login
const updateFcmToken = async (token) => {
    try {
        const response = await fetch('/api/v1/users/fcm-token', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fcm_token: token })
        });
        
        if (response.ok) {
            console.log('FCM token updated successfully');
        }
    } catch (error) {
        console.error('Failed to update FCM token:', error);
    }
};
```