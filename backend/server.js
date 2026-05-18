import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import stockAdjustmentRoutes from './routes/stockAdjustmentRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

dotenv.config();
const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || (!isProduction && origin === 'null') || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true
}));
app.use(express.json({ limit: '256kb' }));
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.get('/', (req, res) => res.json({ message: 'MarketFlow Inventory API is running' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'MarketFlow API is running' }));
app.use('/api/auth',authRoutes);
app.use('/api/products',productRoutes);
app.use('/api/categories',categoryRoutes);
app.use('/api/suppliers',supplierRoutes);
app.use('/api/purchases',purchaseRoutes);
app.use('/api/sales',saleRoutes);
app.use('/api/stock-adjustments',stockAdjustmentRoutes);
app.use('/api/reports',reportRoutes);
app.use((err, req, res, next) => {
  const status = err.message?.startsWith('CORS blocked') ? 403 : 500;
  res.status(status).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`MarketFlow API running on port ${PORT}`));

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
