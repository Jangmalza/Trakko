import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import path from 'path';
import { fileURLToPath } from 'url';
import { Prisma, PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT ?? 4000;
const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL ?? 'http://localhost:5173';
const SESSION_SECRET = process.env.SESSION_SECRET ?? 'trakko_dev_session_secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL ?? `${process.env.API_BASE_URL ?? `http://localhost:${PORT}`}/api/auth/google/callback`;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

const SUPPORTED_CURRENCIES = new Set(['USD', 'KRW']);
const BASE_CURRENCY = 'KRW';
const currencyLocales = {
  USD: 'en-US',
  KRW: 'ko-KR'
};

const defaultPreferences = {
  currency: BASE_CURRENCY,
  locale: currencyLocales[BASE_CURRENCY]
};

const RATE_TTL_MS = 60 * 60 * 1000; // 1 hour
const FALLBACK_KRW_PER_USD = 1300;

let cachedRates = null;
let cachedRatesFetchedAt = 0;

const openaiClient = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

async function fetchRatesFromApi() {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/KRW');
    if (!response.ok) return null;
    const data = await response.json();
    const usdPerKrw = Number(data?.rates?.USD);
    if (!Number.isFinite(usdPerKrw) || usdPerKrw <= 0) return null;
    const krwPerUsd = 1 / usdPerKrw;
    return {
      KRW_PER_USD: krwPerUsd,
      USD_PER_KRW: usdPerKrw
    };
  } catch (error) {
    console.warn('Failed to fetch exchange rates', error);
    return null;
  }
}

async function getRates() {
  const now = Date.now();
  if (cachedRates && now - cachedRatesFetchedAt < RATE_TTL_MS) {
    return cachedRates;
  }

  const fresh = await fetchRatesFromApi();
  if (fresh) {
    cachedRates = fresh;
    cachedRatesFetchedAt = now;
    return cachedRates;
  }

  const fallback = {
    KRW_PER_USD: FALLBACK_KRW_PER_USD,
    USD_PER_KRW: 1 / FALLBACK_KRW_PER_USD
  };
  cachedRates = fallback;
  cachedRatesFetchedAt = now;
  return fallback;
}

async function convertAmount(amount, fromCurrency, toCurrency) {
  if (!Number.isFinite(amount)) return 0;
  if (fromCurrency === toCurrency) return amount;

  const rates = await getRates();

  if (fromCurrency === 'KRW' && toCurrency === 'USD') {
    return amount * rates.USD_PER_KRW;
  }

  if (fromCurrency === 'USD' && toCurrency === 'KRW') {
    return amount * rates.KRW_PER_USD;
  }

  return amount;
}

async function getExchangeRate(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return 1;
  return convertAmount(1, fromCurrency, toCurrency);
}

function normalizeCurrency(value) {
  if (typeof value !== 'string') return defaultPreferences.currency;
  const upper = value.toUpperCase();
  return SUPPORTED_CURRENCIES.has(upper) ? upper : defaultPreferences.currency;
}

async function ensureUserRecord(sessionUser) {
  if (!sessionUser) {
    throw new Error('Authenticated user required');
  }

  await prisma.user.upsert({
    where: { id: sessionUser.id },
    update: {
      displayName: sessionUser.displayName ?? null,
      email: sessionUser.email ?? null
    },
    create: {
      id: sessionUser.id,
      displayName: sessionUser.displayName ?? null,
      email: sessionUser.email ?? null,
      baseCurrency: BASE_CURRENCY,
      preferences: {
        create: defaultPreferences
      }
    }
  });
}

async function getUserWithRelations(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      preferences: true,
      trades: {
        orderBy: { tradeDate: 'asc' }
      }
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.preferences) {
    await prisma.preference.create({
      data: {
        userId,
        currency: defaultPreferences.currency,
        locale: defaultPreferences.locale
      }
    });
    return getUserWithRelations(userId);
  }

  return user;
}

function toNumber(decimal) {
  if (decimal === null || decimal === undefined) return null;
  return Number(decimal);
}

function tradeDateToString(date) {
  return date.toISOString().slice(0, 10);
}

async function mapTradeForResponse(trade, baseCurrency, displayCurrency) {
  const profitLossNumber = Number(trade.profitLoss);
  const converted = await convertAmount(profitLossNumber, baseCurrency, displayCurrency);
  return {
    id: trade.id,
    ticker: trade.ticker,
    profitLoss: converted,
    rationale: trade.rationale,
    tradeDate: tradeDateToString(trade.tradeDate),
    createdAt: trade.createdAt.toISOString(),
    currency: displayCurrency
  };
}

async function getPortfolioResponse(userId) {
  const user = await getUserWithRelations(userId);
  const baseCurrency = normalizeCurrency(user.baseCurrency ?? BASE_CURRENCY);
  const displayCurrency = normalizeCurrency(user.preferences?.currency ?? baseCurrency);
  const exchangeRate = await getExchangeRate(baseCurrency, displayCurrency);

  const initialSeedBase = toNumber(user.initialSeed);
  const initialSeed = initialSeedBase !== null ? await convertAmount(initialSeedBase, baseCurrency, displayCurrency) : null;

  const trades = await Promise.all(
    user.trades.map((trade) => mapTradeForResponse(trade, baseCurrency, displayCurrency))
  );

  return {
    initialSeed,
    trades,
    baseCurrency,
    displayCurrency,
    exchangeRate
  };
}

async function buildPortfolioSummary(userId) {
  const portfolio = await getPortfolioResponse(userId);
  const totalPnL = portfolio.trades.reduce((acc, trade) => acc + trade.profitLoss, 0);
  const currentCapital = portfolio.initialSeed !== null ? portfolio.initialSeed + totalPnL : null;
  const wins = portfolio.trades.filter((trade) => trade.profitLoss >= 0).length;
  const losses = portfolio.trades.length - wins;

  const locale = currencyLocales[portfolio.displayCurrency] ?? 'en-US';
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: portfolio.displayCurrency,
    maximumFractionDigits: portfolio.displayCurrency === 'KRW' ? 0 : 2
  });

  const formatNumber = (value) => {
    if (value === null || !Number.isFinite(value)) return 'N/A';
    return formatter.format(value);
  };

  const recentTrades = portfolio.trades
    .slice(-5)
    .reverse()
    .map((trade) => `${trade.tradeDate} ??${trade.ticker} ??${trade.profitLoss >= 0 ? 'profit' : 'loss'} ${formatNumber(Math.abs(trade.profitLoss))}`);

  return {
    initialSeed: portfolio.initialSeed,
    totalPnL,
    currentCapital,
    wins,
    losses,
    totalTrades: portfolio.trades.length,
    recentTrades,
    currency: portfolio.displayCurrency,
    formatNumber
  };
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

app.use(cors({
  origin: CLIENT_BASE_URL,
  credentials: true
}));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL
    },
    (_accessToken, _refreshToken, profile, done) => {
      const user = {
        id: profile.id,
        displayName: profile.displayName ?? '',
        email: profile.emails?.[0]?.value ?? ''
      };
      done(null, user);
    }
  ));
} else {
  console.warn('Google OAuth credentials are not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable login.');
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/auth/me', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  await ensureUserRecord(req.user);
  res.json(req.user);
});

app.get('/api/portfolio', requireAuth, async (req, res) => {
  try {
    const sessionUser = req.user;
    await ensureUserRecord(sessionUser);
    const snapshot = await getPortfolioResponse(sessionUser.id);
    res.json(snapshot);
  } catch (error) {
    console.error('Failed to read portfolio', error);
    res.status(500).json({ message: 'Failed to read portfolio data' });
  }
});

app.post('/api/portfolio/seed', requireAuth, async (req, res) => {
  try {
    const { initialSeed, currency } = req.body ?? {};
    const seedValue = Number(initialSeed);

    if (!Number.isFinite(seedValue) || seedValue <= 0) {
      return res.status(400).json({ message: 'initialSeed must be a positive number' });
    }

    const sessionUser = req.user;
    await ensureUserRecord(sessionUser);
    const user = await getUserWithRelations(sessionUser.id);
    const baseCurrency = normalizeCurrency(user.baseCurrency ?? BASE_CURRENCY);
    const sourceCurrency = normalizeCurrency(currency ?? user.preferences.currency ?? baseCurrency);
    const seedValueInBase = await convertAmount(seedValue, sourceCurrency, baseCurrency);

    await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        initialSeed: new Prisma.Decimal(seedValueInBase.toFixed(2)),
        baseCurrency
      }
    });

    const snapshot = await getPortfolioResponse(sessionUser.id);
    res.json(snapshot);
  } catch (error) {
    console.error('Failed to update seed', error);
    res.status(500).json({ message: 'Failed to update seed' });
  }
});

app.post('/api/portfolio/trades', requireAuth, async (req, res) => {
  try {
    const {
      ticker,
      profitLoss,
      rationale = '',
      tradeDate,
      currency
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

    const sessionUser = req.user;
    await ensureUserRecord(sessionUser);
    const user = await getUserWithRelations(sessionUser.id);

    if (user.initialSeed === null) {
      return res.status(400).json({ message: 'Set an initial seed before logging trades' });
    }

    const baseCurrency = normalizeCurrency(user.baseCurrency ?? BASE_CURRENCY);
    const displayCurrency = normalizeCurrency(user.preferences?.currency ?? baseCurrency);
    const sourceCurrency = normalizeCurrency(currency ?? displayCurrency);
    const profitLossInBase = await convertAmount(profitLossValue, sourceCurrency, baseCurrency);

    const createdTrade = await prisma.trade.create({
      data: {
        userId: sessionUser.id,
        ticker: ticker.trim().toUpperCase(),
        profitLoss: new Prisma.Decimal(profitLossInBase.toFixed(2)),
        rationale: String(rationale ?? ''),
        tradeDate: new Date(`${tradeDate}T00:00:00.000Z`)
      }
    });

    const response = await mapTradeForResponse(createdTrade, baseCurrency, displayCurrency);
    res.status(201).json(response);
  } catch (error) {
    console.error('Failed to create trade', error);
    res.status(500).json({ message: 'Failed to create trade' });
  }
});

app.patch('/api/portfolio/trades/:tradeId', requireAuth, async (req, res) => {
  try {
    const { tradeId } = req.params;
    const {
      ticker,
      profitLoss,
      rationale = '',
      tradeDate,
      currency
    } = req.body ?? {};

    if (typeof ticker !== 'string' || ticker.trim() === '') {
      return res.status(400).json({ message: '?곗빱瑜??낅젰?댁＜?몄슂.' });
    }

    const profitLossValue = Number(profitLoss);
    if (!Number.isFinite(profitLossValue)) {
      return res.status(400).json({ message: '?먯씡 湲덉븸? ?レ옄?ъ빞 ?⑸땲??' });
    }

    if (typeof tradeDate !== 'string' || tradeDate.trim() === '') {
      return res.status(400).json({ message: '嫄곕옒 ?좎쭨瑜??낅젰?댁＜?몄슂.' });
    }

    const sessionUser = req.user;
    await ensureUserRecord(sessionUser);
    const user = await getUserWithRelations(sessionUser.id);

    const existingTrade = await prisma.trade.findUnique({ where: { id: tradeId } });
    if (!existingTrade || existingTrade.userId !== sessionUser.id) {
      return res.status(404).json({ message: '嫄곕옒瑜?李얠쓣 ???놁뒿?덈떎.' });
    }

    const baseCurrency = normalizeCurrency(user.baseCurrency ?? BASE_CURRENCY);
    const displayCurrency = normalizeCurrency(user.preferences?.currency ?? baseCurrency);
    const sourceCurrency = normalizeCurrency(currency ?? displayCurrency);
    const profitLossInBase = await convertAmount(profitLossValue, sourceCurrency, baseCurrency);

    const updatedTrade = await prisma.trade.update({
      where: { id: tradeId },
      data: {
        ticker: ticker.trim().toUpperCase(),
        profitLoss: new Prisma.Decimal(profitLossInBase.toFixed(2)),
        rationale: String(rationale ?? ''),
        tradeDate: new Date(`${tradeDate}T00:00:00.000Z`)
      }
    });

    const response = await mapTradeForResponse(updatedTrade, baseCurrency, displayCurrency);
    res.json(response);
  } catch (error) {
    console.error('Failed to update trade', error);
    res.status(500).json({ message: '嫄곕옒瑜??섏젙?섏? 紐삵뻽?듬땲??' });
  }
});

app.delete('/api/portfolio/trades/:tradeId', requireAuth, async (req, res) => {
  try {
    const { tradeId } = req.params;
    const sessionUser = req.user;
    await ensureUserRecord(sessionUser);

    const existingTrade = await prisma.trade.findUnique({ where: { id: tradeId } });
    if (!existingTrade || existingTrade.userId !== sessionUser.id) {
      return res.status(404).json({ message: '嫄곕옒瑜?李얠쓣 ???놁뒿?덈떎.' });
    }

    await prisma.trade.delete({ where: { id: tradeId } });
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete trade', error);
    res.status(500).json({ message: '嫄곕옒瑜???젣?섏? 紐삵뻽?듬땲??' });
  }
});

app.get('/api/preferences', requireAuth, async (req, res) => {
  try {
    const sessionUser = req.user;
    await ensureUserRecord(sessionUser);
    const user = await getUserWithRelations(sessionUser.id);
    res.json(user.preferences);
  } catch (error) {
    console.error('Failed to read preferences', error);
    res.status(500).json({ message: 'Failed to read preferences' });
  }
});

app.post('/api/preferences', requireAuth, async (req, res) => {
  try {
    const { currency } = req.body ?? {};
    if (typeof currency !== 'string') {
      return res.status(400).json({ message: 'currency is required' });
    }

    const candidate = normalizeCurrency(currency);

    const sessionUser = req.user;
    await ensureUserRecord(sessionUser);

    const preference = await prisma.preference.upsert({
      where: { userId: sessionUser.id },
      update: {
        currency: candidate,
        locale: currencyLocales[candidate] ?? defaultPreferences.locale
      },
      create: {
        userId: sessionUser.id,
        currency: candidate,
        locale: currencyLocales[candidate] ?? defaultPreferences.locale
      }
    });

    res.json(preference);
  } catch (error) {
    console.error('Failed to update preferences', error);
    res.status(500).json({ message: 'Failed to update preferences' });
  }
});

app.post('/api/portfolio/reset', requireAuth, async (req, res) => {
  try {
    const sessionUser = req.user;
    await ensureUserRecord(sessionUser);

    await prisma.trade.deleteMany({ where: { userId: sessionUser.id } });
    await prisma.user.update({
      where: { id: sessionUser.id },
      data: { initialSeed: null }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Failed to reset portfolio', error);
    res.status(500).json({ message: 'Failed to reset portfolio' });
  }
});

app.post('/api/chat/assistant', requireAuth, async (req, res) => {
  if (!openaiClient) {
    return res.status(503).json({ message: 'Chat assistant is not configured.' });
  }

  const { messages } = req.body ?? {};

  if (!Array.isArray(messages)) {
    return res.status(400).json({ message: 'messages must be an array' });
  }

  const sanitizedMessages = messages
    .filter((message) => message && typeof message === 'object')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: typeof message.content === 'string' ? message.content : ''
    }))
    .filter((message) => message.content.trim().length > 0)
    .slice(-10);

  try {
    const sessionUser = req.user;
    await ensureUserRecord(sessionUser);
    const summary = await buildPortfolioSummary(sessionUser.id);

    const summaryLines = [
      `Display currency: ${summary.currency}`,
      `Initial seed: ${summary.initialSeed !== null ? summary.formatNumber(summary.initialSeed) : 'Not set'}`,
      `Total PnL: ${summary.formatNumber(summary.totalPnL)}`,
      `Current capital: ${summary.currentCapital !== null ? summary.formatNumber(summary.currentCapital) : 'Unknown'}`,
      `Total trades: ${summary.totalTrades}`,
      `Wins: ${summary.wins}`,
      `Losses: ${summary.losses}`
    ];

    const recentLines = summary.recentTrades.length > 0
      ? summary.recentTrades.map((line, index) => `${index + 1}. ${line}`).join('\n')
      : 'No recent trades available.';

    const systemPrompt = [
      'You are Trakko, an investment journal assistant that offers actionable trading insights.',
      'Use the provided portfolio metrics to answer succinctly in Korean.',
      'Highlight risk management tips, pattern recognition, and next-step suggestions when appropriate.',
      'If information is missing, acknowledge it and guide the user on how to collect it.'
    ].join(' ');

    const contextPrompt = `Portfolio snapshot:\n${summaryLines.join('\n')}\n\nRecent trades:\n${recentLines}`;

    const completion = await openaiClient.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.2,
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: contextPrompt },
        ...sanitizedMessages
      ]
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error('Missing content in assistant response');
    }

    res.json({ message: reply });
  } catch (error) {
    console.error('Failed to generate assistant response', error);
    res.status(500).json({ message: 'Failed to generate assistant response' });
  }
});

app.post('/api/auth/logout', (req, res, next) => {
  req.logout((logoutError) => {
    if (logoutError) {
      return next(logoutError);
    }
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.status(204).send();
    });
  });
});

async function start() {
  try {
    app.listen(PORT, () => {
      console.log(`Portfolio API server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

start();

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

