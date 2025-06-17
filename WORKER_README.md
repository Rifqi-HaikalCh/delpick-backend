# DelPick Worker System

Worker system untuk menangani background jobs menggunakan Redis Queue (Bull).

## 🚀 Fitur Worker

### 1. **Expired Driver Requests Check**
- Mengecek driver request yang sudah expired (lebih dari 15 menit)
- Berjalan otomatis setiap menit menggunakan cron job
- Menangani reassignment order ke driver lain

### 2. **Driver Request Timeout Management**
- Schedule timeout untuk setiap driver request yang dibuat
- Otomatis cancel timeout ketika driver merespons
- Menangani timeout secara asinkron menggunakan queue

## 📦 Instalasi

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup Redis:**
   Pastikan Redis sudah running dan konfigurasi di `.env`:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=your_password
   REDIS_TLS=false
   ```

## 🏃‍♂️ Menjalankan Worker

### Development Mode

1. **Jalankan server dan worker bersamaan:**
   ```bash
   npm run dev:all
   ```

2. **Jalankan worker saja:**
   ```bash
   npm run dev:worker
   ```

3. **Jalankan server saja:**
   ```bash
   npm run dev
   ```

### Production Mode

1. **Jalankan server:**
   ```bash
   npm start
   ```

2. **Jalankan worker (di terminal terpisah):**
   ```bash
   npm run worker
   ```

## 🔧 Konfigurasi Worker

### Queue Configuration
Worker menggunakan 2 queue utama:

1. **background-jobs**: Untuk recurring jobs seperti expired request check
2. **driver-requests**: Untuk timeout management driver requests

### Job Options
```javascript
// Expired requests check - berjalan setiap menit
{
    repeat: { cron: '* * * * *' },
    removeOnComplete: 10,
    removeOnFail: 5
}

// Driver request timeout - delay 15 menit
{
    delay: 15 * 60 * 1000,
    removeOnComplete: 5,
    removeOnFail: 3
}
```

## 📊 Monitoring Worker

### Worker Status API
Tambahkan endpoint ini untuk monitoring (opsional):

```javascript
// GET /api/v1/worker/status
app.get('/api/v1/worker/status', async (req, res) => {
    const { workerManager } = require('./worker');
    const status = await workerManager.getWorkerStatus();
    res.json(status);
});
```

### Log Monitoring
Worker menggunakan winston logger dengan format:
- Info: Job completion, scheduling
- Error: Job failures, Redis connection issues
- Debug: Job processing details

## 🔄 Flow Proses

### 1. **Saat Order Dibuat:**
```
Order Created → Find Driver → Create DriverRequest → Schedule Timeout (15 min)
```

### 2. **Saat Driver Merespons:**
```
Driver Response → Update DriverRequest Status → Cancel Scheduled Timeout
```

### 3. **Saat Timeout Tercapai:**
```
Timeout Job Executed → Mark Request as Expired → Find New Drivers → Reschedule
```

### 4. **Background Check (Setiap Menit):**
```
Cron Job → Check Expired Requests → Handle Reassignment → Update Order Status
```

## 🛠️ Troubleshooting

### Redis Connection Issues
```bash
# Check Redis status
redis-cli ping

# Check Redis authentication
redis-cli -a your_password ping
```

### Worker Not Processing Jobs
1. Pastikan Redis running
2. Check environment variables
3. Check worker logs untuk error
4. Restart worker: `npm run dev:worker`

### Memory Issues
Worker otomatis cleanup jobs lama:
- Completed jobs: Keep last 10
- Failed jobs: Keep last 5

## 📝 Environment Variables

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_TLS=false

# Application
NODE_ENV=development
PORT=3000
```

## 🚨 Production Considerations

1. **Process Management:** Gunakan PM2 atau Docker untuk auto-restart
2. **Redis Persistence:** Enable Redis persistence untuk job recovery
3. **Monitoring:** Setup monitoring untuk queue metrics
4. **Scaling:** Bisa menjalankan multiple worker instances
5. **Error Handling:** Setup alerts untuk failed jobs

## 📋 Commands Cheat Sheet

```bash
# Development
npm run dev:all        # Server + Worker
npm run dev           # Server only
npm run dev:worker    # Worker only

# Production
npm start             # Server only
npm run worker        # Worker only

# Database
npm run migrate       # Run migrations
npm run seed          # Seed database
``` 