import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { access, mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';

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

  // Unsupported conversion path, return original amount
  return amount;
}

async function getExchangeRate(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return 1;
  const converted = await convertAmount(1, fromCurrency, toCurrency);
  return converted;
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

const dataDir = path.join(__dirname, 'data');

function normalizeCurrency(value) {
  if (typeof value !== 'string') return defaultPreferences.currency;
  const upper = value.toUpperCase();
  return SUPPORTED_CURRENCIES.has(upper) ? upper : defaultPreferences.currency;
}

function normalizePreferences(preferences) {
  const normalizedCurrency = normalizeCurrency(preferences?.currency);
  const localeCandidate = typeof preferences?.locale === 'string' && preferences.locale.length > 0
    ? preferences.locale
    : currencyLocales[normalizedCurrency];

  return {
    currency: normalizedCurrency,
    locale: localeCandidate
  };
}

function createDefaultPortfolio(overrides = {}) {
  const trades = Array.isArray(overrides.trades) ? [...overrides.trades] : [];
  const initialSeedValue = Number.isFinite(overrides.initialSeed) ? overrides.initialSeed : null;

  return {
    initialSeed: initialSeedValue,
    trades,
    baseCurrency: BASE_CURRENCY,
    preferences: normalizePreferences(overrides.preferences ?? defaultPreferences)
  };
}

function normalizePortfolio(portfolio) {
  if (!portfolio || typeof portfolio !== 'object') {
    return createDefaultPortfolio();
  }

  const initialSeed = Number.isFinite(portfolio.initialSeed) ? portfolio.initialSeed : null;
  const trades = Array.isArray(portfolio.trades)
    ? portfolio.trades.map((trade) => {
      const profitLossValue = Number(trade?.profitLoss);
      return {
        ...trade,
        profitLoss: Number.isFinite(profitLossValue) ? profitLossValue : 0
      };
    })
    : [];

  return {
    initialSeed,
    trades,
    baseCurrency: normalizeCurrency(portfolio.baseCurrency ?? BASE_CURRENCY),
    preferences: normalizePreferences(portfolio.preferences)
  };
}

async function mapPortfolioForResponse(portfolio) {
  const baseCurrency = normalizeCurrency(portfolio.baseCurrency ?? BASE_CURRENCY);
  const displayCurrency = normalizeCurrency(portfolio.preferences?.currency ?? BASE_CURRENCY);

  const initialSeed = portfolio.initialSeed === null
    ? null
    : await convertAmount(portfolio.initialSeed, baseCurrency, displayCurrency);

  const trades = await Promise.all(
    portfolio.trades.map(async (trade) => ({
      ...trade,
      profitLoss: await convertAmount(trade.profitLoss, baseCurrency, displayCurrency),
      currency: displayCurrency
    }))
  );

  const exchangeRate = await getExchangeRate(baseCurrency, displayCurrency);

  return {
    initialSeed,
    trades,
    baseCurrency,
    displayCurrency,
    exchangeRate
  };
}

const portfolioPathForUser = (userId) => path.join(dataDir, `portfolio-${userId}.json`);

async function ensurePortfolioFileForUser(userId) {
  await mkdir(dataDir, { recursive: true });
  const filePath = portfolioPathForUser(userId);
  try {
    await access(filePath);
  } catch {
    await writeFile(filePath, JSON.stringify(createDefaultPortfolio(), null, 2), 'utf8');
  }
  return filePath;
}

async function readPortfolioForUser(userId) {
  const filePath = await ensurePortfolioFileForUser(userId);
  const raw = await readFile(filePath, 'utf8');
  return normalizePortfolio(JSON.parse(raw));
}

async function writePortfolioForUser(userId, portfolio) {
  const filePath = portfolioPathForUser(userId);
  await mkdir(dataDir, { recursive: true });
  const normalized = normalizePortfolio(portfolio);
  await writeFile(filePath, JSON.stringify(normalized, null, 2), 'utf8');
}

async function buildPortfolioSummary(portfolio) {
  const mapped = await mapPortfolioForResponse(portfolio);
  const { initialSeed, trades, displayCurrency } = mapped;
  const totalPnL = trades.reduce((acc, trade) => acc + (Number(trade.profitLoss) || 0), 0);
  const currentCapital = initialSeed !== null ? initialSeed + totalPnL : null;
  const wins = trades.filter((trade) => Number(trade.profitLoss) >= 0).length;
  const losses = trades.length - wins;

  const formatNumber = (value) => {
    if (!Number.isFinite(value)) return 'N/A';
    const locale = currencyLocales[displayCurrency] ?? 'en-US';
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: displayCurrency,
      maximumFractionDigits: displayCurrency === 'KRW' ? 0 : 2
    });
    return formatter.format(value);
  };

  const recentTrades = trades
    .slice(-5)
    .reverse()
    .map((trade) => {
      const direction = Number(trade.profitLoss) >= 0 ? 'profit' : 'loss';
      return `${trade.tradeDate ?? 'unknown date'} • ${trade.ticker ?? 'N/A'} • ${direction} ${formatNumber(trade.profitLoss)}`;
    });

  return {
    initialSeed,
    totalPnL,
    currentCapital,
    wins,
    losses,
    totalTrades: trades.length,
    recentTrades,
    currency: displayCurrency
  };
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  res.json(req.user);
});

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  app.get('/api/auth/google', (req, res, next) => {
    const redirect = typeof req.query.redirect === 'string' ? req.query.redirect : undefined;
    if (redirect) {
      req.session.redirectTo = redirect;
    }
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
  });

  app.get(
    '/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: `${CLIENT_BASE_URL}/auth/callback?error=google` }),
    (req, res) => {
      const redirectTo = req.session.redirectTo ?? `${CLIENT_BASE_URL}/auth/callback`;
      delete req.session.redirectTo;
      res.redirect(redirectTo);
    }
  );
} else {
  app.get('/api/auth/google', (_req, res) => {
    res.status(503).json({ message: 'Google authentication is not configured.' });
  });

  app.get('/api/auth/google/callback', (_req, res) => {
    res.redirect(`${CLIENT_BASE_URL}/auth/callback?error=unavailable`);
  });
}

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

app.get('/api/portfolio', requireAuth, async (req, res) => {
  try {
    const portfolio = await readPortfolioForUser(req.user.id);
    const response = await mapPortfolioForResponse(portfolio);
    res.json(response);
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

    const portfolio = await readPortfolioForUser(req.user.id);
    const baseCurrency = portfolio.baseCurrency ?? BASE_CURRENCY;
    const sourceCurrency = normalizeCurrency(currency ?? portfolio.preferences?.currency);
    const seedValueInBase = await convertAmount(seedValue, sourceCurrency, baseCurrency);

    const next = {
      ...portfolio,
      initialSeed: seedValueInBase
    };

    await writePortfolioForUser(req.user.id, next);
    const response = await mapPortfolioForResponse(next);
    res.json(response);
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

    const portfolio = await readPortfolioForUser(req.user.id);
    if (portfolio.initialSeed === null) {
      return res.status(400).json({ message: 'Set an initial seed before logging trades' });
    }

    const baseCurrency = portfolio.baseCurrency ?? BASE_CURRENCY;
    const sourceCurrency = normalizeCurrency(currency ?? portfolio.preferences?.currency);
    const profitLossInBase = await convertAmount(profitLossValue, sourceCurrency, baseCurrency);

    const newTrade = {
      id: `trade-${randomUUID()}`,
      ticker: ticker.trim().toUpperCase(),
      profitLoss: profitLossInBase,
      rationale: String(rationale ?? ''),
      tradeDate,
      createdAt: new Date().toISOString()
    };

    const next = {
      ...portfolio,
      trades: [...portfolio.trades, newTrade]
    };

    await writePortfolioForUser(req.user.id, next);

    const profitLossDisplay = await convertAmount(newTrade.profitLoss, baseCurrency, portfolio.preferences.currency);
    res.status(201).json({ ...newTrade, profitLoss: profitLossDisplay, currency: portfolio.preferences.currency });
  } catch (error) {
    console.error('Failed to create trade', error);
    res.status(500).json({ message: 'Failed to create trade' });
  }
});

app.get('/api/preferences', requireAuth, async (req, res) => {
  try {
    const portfolio = await readPortfolioForUser(req.user.id);
    res.json(portfolio.preferences);
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

    const candidate = currency.toUpperCase();
    if (!SUPPORTED_CURRENCIES.has(candidate)) {
      return res.status(400).json({ message: 'Unsupported currency' });
    }

    const portfolio = await readPortfolioForUser(req.user.id);
    const nextPreferences = {
      currency: candidate,
      locale: currencyLocales[candidate] ?? defaultPreferences.locale
    };

    const next = {
      ...portfolio,
      preferences: nextPreferences
    };

    await writePortfolioForUser(req.user.id, next);
    res.json(nextPreferences);
  } catch (error) {
    console.error('Failed to update preferences', error);
    res.status(500).json({ message: 'Failed to update preferences' });
  }
});

app.post('/api/portfolio/reset', requireAuth, async (req, res) => {
  try {
    const portfolio = await readPortfolioForUser(req.user.id);
    const next = createDefaultPortfolio({ preferences: portfolio.preferences });
    await writePortfolioForUser(req.user.id, next);
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
    const portfolio = await readPortfolioForUser(req.user.id);
    const summary = await buildPortfolioSummary(portfolio);

    const summaryLines = [
      `Display currency: ${summary.currency}`,
      `Initial seed: ${summary.initialSeed !== null ? formatNumber(summary.initialSeed) : 'Not set'}`,
      `Total PnL: ${formatNumber(summary.totalPnL)}`,
      `Current capital: ${summary.currentCapital !== null ? formatNumber(summary.currentCapital) : 'Unknown'}`,
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

async function start() {
  try {
    await mkdir(dataDir, { recursive: true });
    app.listen(PORT, () => {
      console.log(`Portfolio API server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
