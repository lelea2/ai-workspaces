import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { aiRouter } from './routes/ai.js';
import { dataRouter } from './routes/data.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);
const app = express();
app.use(express.json());
app.use('/api/ai', aiRouter);
app.use('/api/data', dataRouter);
// Serve built Vite app in production
if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '../workspace/dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}
app.listen(PORT, () => {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-xxxxx') {
        console.warn('⚠  OPENAI_API_KEY is not set — /api/ai routes will fail');
    }
    const mode = process.env.MOCK_AI === 'true' ? 'mock' : 'openai';
    console.log(`Server listening on http://localhost:${PORT}  (provider=${mode})`);
});
