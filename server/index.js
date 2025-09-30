import express from 'express';
import cors from 'cors';
import { access, mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');
const portfolioFilePath = path.join(dataDir, 'portfolio.json');

const defaultPortfolio = {
  initialSeed: null,
  trades: []
};

async function ensurePortfolioFile() {
  await mkdir(dataDir, { recursive: true });
  try {
    await access(portfolioFilePath);
  } catch {
    await writePortfolio(defaultPortfolio);
  }
}

async function readPortfolio() {
  const raw = await readFile(portfolioFilePath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    initialSeed: parsed.initialSeed ?? null,
    trades: Array.isArray(parsed.trades) ? parsed.trades : []
  };
}

async function writePortfolio(portfolio) {
  await writeFile(portfolioFilePath, JSON.stringify(portfolio, null, 2), 'utf8');
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/portfolio', async (_req, res) => {
  try {
    const snapshot = await readPortfolio();
    res.json(snapshot);
  } catch (error) {
    console.error('Failed to read portfolio', error);
    res.status(500).json({ message: 'Failed to read portfolio data' });
  }
});

app.post('/api/portfolio/seed', async (req, res) => {
  try {
    const { initialSeed } = req.body ?? {};
    const seedValue = Number(initialSeed);

    if (!Number.isFinite(seedValue) || seedValue <= 0) {
      return res.status(400).json({ message: 'initialSeed must be a positive number' });
    }

    const portfolio = await readPortfolio();
    const next = {
      ...portfolio,
      initialSeed: seedValue
    };

    await writePortfolio(next);
    res.json(next);
  } catch (error) {
    console.error('Failed to update seed', error);
    res.status(500).json({ message: 'Failed to update seed' });
  }
});

app.post('/api/portfolio/trades', async (req, res) => {
  try {
    const {
      ticker,
      profitLoss,
      rationale = '',
      tradeDate
    } = req.body ?? {};

    if (typeof ticker !== 'string' || ticker.trim() === '') {
      return res.status(400).json({ message: 'ticker is required' });
    }

    const profitLossValue = Number(profitLoss);
    if (!Number.isFinite(profitLossValue)) {
      return res.status(400).json({ message: 'profitLoss must be a number' });
    }

    if (typeof tradeDate !== 'string' || tradeDate.trim() === '') {
      return res.status(400).json({ message: 'tradeDate is required' });
    }

    const portfolio = await readPortfolio();
    if (portfolio.initialSeed === null) {
      return res.status(400).json({ message: 'Set an initial seed before logging trades' });
    }

    const newTrade = {
      id: `trade-${randomUUID()}`,
      ticker: ticker.trim().toUpperCase(),
      profitLoss: profitLossValue,
      rationale: String(rationale ?? ''),
      tradeDate,
      createdAt: new Date().toISOString()
    };

    const next = {
      ...portfolio,
      trades: [...portfolio.trades, newTrade]
    };

    await writePortfolio(next);

    res.status(201).json(newTrade);
  } catch (error) {
    console.error('Failed to create trade', error);
    res.status(500).json({ message: 'Failed to create trade' });
  }
});

app.post('/api/portfolio/reset', async (_req, res) => {
  try {
    await writePortfolio(defaultPortfolio);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to reset portfolio', error);
    res.status(500).json({ message: 'Failed to reset portfolio' });
  }
});

async function start() {
  try {
    await ensurePortfolioFile();
    app.listen(PORT, () => {
      console.log(`Portfolio API server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
