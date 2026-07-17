import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initStorage, loadData, saveCollection, ClinicData } from './db-store';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  
  // Parse JSON bodies up to 10MB (for large lists)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Initialize DB Storage
  await initStorage();

  // API Route: Get all clinic data
  app.get('/api/data', async (req, res) => {
    try {
      const data = await loadData();
      res.json(data);
    } catch (err: any) {
      console.error('API Error /api/data:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Save specific clinic collection
  app.post('/api/save', async (req, res) => {
    try {
      const { key, data } = req.body;
      if (!key || !Array.isArray(data)) {
        return res.status(400).json({ error: 'Kalit va massiv ko\'rinishidagi ma\'lumot kiritilishi shart.' });
      }
      
      const success = await saveCollection(key as keyof ClinicData, data);
      if (success) {
        res.json({ success: true, message: `Muvaffaqiyatli saqlandi: ${key}` });
      } else {
        res.status(500).json({ error: 'Saqlashda xatolik yuz berdi.' });
      }
    } catch (err: any) {
      console.error('API Error /api/save:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    console.log('🚀 [Server Mode]: Running in Development with Vite HMR Middleware.');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('📦 [Server Mode]: Running in Production serving static built files.');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 [Express Server]: Running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('💥 [Server Start Failed]:', err);
});
