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
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter((email) => email.length > 0);
const ADMIN_EMAIL_SET = new Set(ADMIN_EMAILS);
const ANNOUNCEMENT_STATUS_VALUES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const ANNOUNCEMENT_STATUS_SET = new Set(ANNOUNCEMENT_STATUS_VALUES);

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

const CLIENT_BASE_URL_CLEAN = CLIENT_BASE_URL.replace(/\/$/, '');
const CLIENT_ORIGIN = (() => {
  try {
    return new URL(CLIENT_BASE_URL_CLEAN).origin;
  } catch (_error) {
    return CLIENT_BASE_URL_CLEAN;
  }
})();

const buildClientUrl = (pathname) => {
  try {
    return new URL(pathname, `${CLIENT_BASE_URL_CLEAN}/`).toString();
  } catch (_error) {
    return `${CLIENT_BASE_URL_CLEAN}${pathname}`;
  }
};

const DEFAULT_AUTH_CALLBACK_URL = buildClientUrl('/auth/callback');
const DEFAULT_POST_LOGIN_REDIRECT = buildClientUrl('/dashboard');
const FAILURE_REDIRECT_URL = buildClientUrl('/?auth=failed');

const resolveClientRedirect = (candidate, fallback) => {
  if (typeof candidate !== 'string' || candidate.length === 0) {
    return fallback;
  }

  try {
    const target = new URL(candidate, `${CLIENT_BASE_URL_CLEAN}/`);
    if (target.origin !== CLIENT_ORIGIN) {
      return fallback;
    }
    return target.toString();
  } catch (_error) {
    return fallback;
  }
};

const GOOGLE_AUTH_CONFIGURED = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

const RATE_TTL_MS = 60 * 60 * 1000; // 1 hour
const FALLBACK_KRW_PER_USD = 1300;

let cachedRates = null;
let cachedRatesFetchedAt = 0;

const openaiClient = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

const getCurrentYearMonth = (date = new Date()) => ({
  year: date.getFullYear(),
  month: date.getMonth() + 1
});

const clampYearMonth = (year, month) => {
  const safeYear = Number.isInteger(year) ? year : new Date().getFullYear();
  let safeMonth = Number.isInteger(month) ? month : new Date().getMonth() + 1;
  if (safeMonth < 1) safeMonth = 1;
  if (safeMonth > 12) safeMonth = 12;
  return { year: safeYear, month: safeMonth };
};

const formatMonthLabel = (year, month, displayCurrency) => {
  const locale = currencyLocales[displayCurrency] ?? 'en-US';
  const formatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  return formatter.format(new Date(year, month - 1, 1));
};

const roundCurrency = (value, currency) => {
  if (!Number.isFinite(value)) return 0;
  const fractionDigits = currency === 'KRW' ? 0 : 2;
  const factor = 10 ** fractionDigits;
  return Math.round(value * factor) / factor;
};

class AssistantError extends Error {
  constructor(message, { status = 500, code } = {}) {
    super(message);
    this.name = 'AssistantError';
    this.status = status;
    this.code = code;
  }
}

const extractResponseText = (response) => {
  if (!response) return '';

  if (typeof response.output_text === 'string' && response.output_text.trim().length > 0) {
    return response.output_text.trim();
  }

  const segments = Array.isArray(response.output)
    ? response.output.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const content = Array.isArray(item.content) ? item.content : [];
        return content
          .filter((part) => part && typeof part.text === 'string')
          .map((part) => part.text);
      })
    : [];

  return segments.join(' ').trim();
};

async function createAssistantReply(messages) {
  if (!openaiClient) {
    throw new Error('Chat assistant is not configured.');
  }

  try {
    const response = await openaiClient.responses.create({
      model: OPENAI_MODEL,
      max_output_tokens: 600,
      input: messages
    });

    const reply = extractResponseText(response);
    if (reply) {
      return reply;
    }

    console.warn('OpenAI Responses API returned empty output, falling back to chat completions.');
  } catch (error) {
    const status = (error && typeof error === 'object' && 'status' in error) ? error.status : undefined;
    const code = (error && typeof error === 'object' && 'code' in error) ? error.code : undefined;
    const quotaExceeded = status === 429 || code === 'insufficient_quota';

    if (quotaExceeded) {
      throw new AssistantError('OpenAI 사용 한도를 초과했습니다. 결제 상태를 확인하거나 잠시 후 다시 시도해주세요.', {
        status: 429,
        code: 'insufficient_quota'
      });
    }

    if (status === 400 || status === 404) {
      console.warn('OpenAI Responses API not available for this model, falling back to chat completions.', error);
    } else {
      throw error;
    }
  }

  try {
    const completion = await openaiClient.chat.completions.create({
      model: OPENAI_MODEL,
      max_completion_tokens: 600,
      messages
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      throw new AssistantError('어시스턴트 응답을 생성하지 못했습니다.', { status: 502 });
    }

    return reply;
  } catch (error) {
    const status = (error && typeof error === 'object' && 'status' in error) ? error.status : undefined;
    const code = (error && typeof error === 'object' && 'code' in error) ? error.code : undefined;
    const quotaExceeded = status === 429 || code === 'insufficient_quota';

    if (quotaExceeded) {
      throw new AssistantError('OpenAI 사용 한도를 초과했습니다. 결제 상태를 확인하거나 잠시 후 다시 시도해주세요.', {
        status: 429,
        code: 'insufficient_quota'
      });
    }

    throw error;
  }
}

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

  const normalizedEmail = typeof sessionUser.email === 'string'
    ? sessionUser.email.toLowerCase()
    : null;
  const shouldGrantAdmin = normalizedEmail && ADMIN_EMAIL_SET.has(normalizedEmail);

  const userRecord = await prisma.user.upsert({
    where: { id: sessionUser.id },
    update: {
      displayName: sessionUser.displayName ?? null,
      email: sessionUser.email ?? null,
      ...(shouldGrantAdmin ? { role: 'ADMIN' } : {})
    },
    create: {
      id: sessionUser.id,
      displayName: sessionUser.displayName ?? null,
      email: sessionUser.email ?? null,
      baseCurrency: BASE_CURRENCY,
      role: shouldGrantAdmin ? 'ADMIN' : undefined,
      preferences: {
        create: defaultPreferences
      }
    }
  });

  sessionUser.displayName = userRecord.displayName ?? sessionUser.displayName ?? '';
  sessionUser.email = userRecord.email ?? sessionUser.email;
  sessionUser.role = userRecord.role;

  return userRecord;
}

function parseOptionalDate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isAnnouncementVisible(announcement, referenceDate = new Date()) {
  if (!announcement) return false;
  if (announcement.status !== 'PUBLISHED') return false;
  if (announcement.publishedAt && announcement.publishedAt > referenceDate) return false;
  if (announcement.expiresAt && announcement.expiresAt <= referenceDate) return false;
  return true;
}

function sanitizeAnnouncement(announcement) {
  return {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    status: announcement.status,
    publishedAt: announcement.publishedAt,
    expiresAt: announcement.expiresAt,
    createdAt: announcement.createdAt,
    updatedAt: announcement.updatedAt,
    author: announcement.author
      ? {
          id: announcement.author.id,
          displayName: announcement.author.displayName ?? '',
          email: announcement.author.email ?? null
        }
      : null
  };
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

  const { year, month } = getCurrentYearMonth();
  const performanceGoal = await buildPerformanceGoalSummary({
    userId,
    baseCurrency,
    displayCurrency,
    trades,
    year,
    month
  });

  return {
    initialSeed,
    trades,
    baseCurrency,
    displayCurrency,
    exchangeRate,
    performanceGoal
  };
}

async function buildPerformanceGoalSummary({ userId, baseCurrency, displayCurrency, trades, year, month }) {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const achievedAmountRaw = trades
    .filter((trade) => trade.tradeDate?.startsWith(monthKey))
    .reduce((acc, trade) => acc + trade.profitLoss, 0);

  const achievedAmount = roundCurrency(achievedAmountRaw, displayCurrency);
  const monthLabel = formatMonthLabel(year, month, displayCurrency);

  const goal = await prisma.performanceGoal.findUnique({
    where: {
      userId_targetYear_targetMonth: {
        userId,
        targetYear: year,
        targetMonth: month
      }
    }
  });

  if (!goal) {
    return {
      goal: null,
      achievedAmount,
      remainingAmount: null,
      progressPercent: null,
      month: {
        year,
        month,
        label: monthLabel
      }
    };
  }

  const targetAmountBase = Number(goal.targetAmount);
  const targetAmountDisplayRaw = await convertAmount(targetAmountBase, baseCurrency, displayCurrency);
  const targetAmountDisplay = roundCurrency(targetAmountDisplayRaw, displayCurrency);
  const remainingAmount = roundCurrency(targetAmountDisplay - achievedAmount, displayCurrency);
  const progressPercent = targetAmountDisplay > 0
    ? Math.min(100, Math.max(0, (achievedAmount / targetAmountDisplay) * 100))
    : null;

  return {
    goal: {
      id: goal.id,
      targetAmount: targetAmountDisplay,
      currency: displayCurrency,
      targetYear: goal.targetYear,
      targetMonth: goal.targetMonth
    },
    achievedAmount,
    remainingAmount,
    progressPercent: progressPercent !== null ? Math.round(progressPercent * 100) / 100 : null,
    month: {
      year,
      month,
      label: monthLabel
    }
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

async function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const userRecord = await ensureUserRecord(req.user);
    if (userRecord.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  } catch (error) {
    console.error('Failed to verify admin privileges', error);
    res.status(500).json({ message: 'Failed to verify access' });
  }
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

if (GOOGLE_AUTH_CONFIGURED) {
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

app.get('/api/auth/google', (req, res, next) => {
  if (!GOOGLE_AUTH_CONFIGURED) {
    return res.status(503).json({ message: 'Google OAuth is not configured.' });
  }

  const redirectTarget = resolveClientRedirect(req.query.redirect, DEFAULT_AUTH_CALLBACK_URL);

  if (req.session) {
    req.session.authRedirect = redirectTarget;
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    session: true
  })(req, res, next);
});

app.get(
  '/api/auth/google/callback',
  (req, res, next) => {
    if (!GOOGLE_AUTH_CONFIGURED) {
      return res.status(503).json({ message: 'Google OAuth is not configured.' });
    }

    passport.authenticate('google', {
      failureRedirect: FAILURE_REDIRECT_URL,
      session: true
    })(req, res, next);
  },
  async (req, res) => {
    const sessionUser = req.user;

    if (!sessionUser) {
      return res.redirect(FAILURE_REDIRECT_URL);
    }

    try {
      await ensureUserRecord(sessionUser);
    } catch (error) {
      console.error('Failed to ensure user record after Google login', error);
      return res.redirect(FAILURE_REDIRECT_URL);
    }

    const redirectTarget = req.session?.authRedirect ?? DEFAULT_POST_LOGIN_REDIRECT;

    if (req.session) {
      delete req.session.authRedirect;
      req.session.save((saveError) => {
        if (saveError) {
          console.error('Failed to persist session after Google login', saveError);
        }
        res.redirect(redirectTarget);
      });
      return;
    }

    res.redirect(redirectTarget);
  }
);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/auth/me', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const userRecord = await ensureUserRecord(req.user);
    res.json({
      id: userRecord.id,
      displayName: userRecord.displayName ?? req.user.displayName ?? '',
      email: userRecord.email ?? undefined,
      role: userRecord.role
    });
  } catch (error) {
    console.error('Failed to load authenticated user', error);
    res.status(500).json({ message: 'Failed to load user profile' });
  }
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

app.get('/api/goals/current', requireAuth, async (req, res) => {
  try {
    const sessionUser = req.user;
    await ensureUserRecord(sessionUser);
    const snapshot = await getPortfolioResponse(sessionUser.id);
    res.json(snapshot.performanceGoal);
  } catch (error) {
    console.error('Failed to read performance goal', error);
    res.status(500).json({ message: 'Failed to read performance goal' });
  }
});

app.post('/api/goals/current', requireAuth, async (req, res) => {
  try {
    const {
      targetAmount,
      currency,
      year,
      month
    } = req.body ?? {};

    const amountValue = Number(targetAmount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return res.status(400).json({ message: 'targetAmount must be a positive number' });
    }

    const { year: targetYear, month: targetMonth } = clampYearMonth(Number(year), Number(month));

    const sessionUser = req.user;
    await ensureUserRecord(sessionUser);
    const user = await getUserWithRelations(sessionUser.id);
    const baseCurrency = normalizeCurrency(user.baseCurrency ?? BASE_CURRENCY);
    const displayCurrency = normalizeCurrency(user.preferences?.currency ?? baseCurrency);
    const sourceCurrency = normalizeCurrency(currency ?? displayCurrency);

    const amountInBase = await convertAmount(amountValue, sourceCurrency, baseCurrency);
    if (!Number.isFinite(amountInBase) || amountInBase <= 0) {
      return res.status(400).json({ message: 'Failed to convert target amount to base currency' });
    }

    await prisma.performanceGoal.upsert({
      where: {
        userId_targetYear_targetMonth: {
          userId: sessionUser.id,
          targetYear,
          targetMonth
        }
      },
      update: {
        targetAmount: new Prisma.Decimal(amountInBase.toFixed(2)),
        currency: baseCurrency
      },
      create: {
        userId: sessionUser.id,
        targetYear,
        targetMonth,
        targetAmount: new Prisma.Decimal(amountInBase.toFixed(2)),
        currency: baseCurrency
      }
    });

    const snapshot = await getPortfolioResponse(sessionUser.id);
    res.json(snapshot.performanceGoal);
  } catch (error) {
    console.error('Failed to upsert performance goal', error);
    res.status(500).json({ message: 'Failed to upsert performance goal' });
  }
});

app.delete('/api/goals/current', requireAuth, async (req, res) => {
  try {
    const { year, month } = req.query ?? {};
    const { year: targetYear, month: targetMonth } = clampYearMonth(Number(year), Number(month));

    const sessionUser = req.user;
    await ensureUserRecord(sessionUser);

    const existingGoal = await prisma.performanceGoal.findUnique({
      where: {
        userId_targetYear_targetMonth: {
          userId: sessionUser.id,
          targetYear,
          targetMonth
        }
      }
    });

    if (existingGoal) {
      await prisma.performanceGoal.delete({
        where: { id: existingGoal.id }
      });
    }

    const snapshot = await getPortfolioResponse(sessionUser.id);
    res.json(snapshot.performanceGoal);
  } catch (error) {
    console.error('Failed to delete performance goal', error);
    res.status(500).json({ message: 'Failed to delete performance goal' });
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
      'Respond in Korean using short sections with brief headings or bold labels when helpful.',
      'Prefer bullet lists for recommendations or checklists and keep each bullet under two sentences.',
      'Leave blank lines between sections to improve readability.',
      'Highlight risk management tips, pattern recognition, and next-step suggestions when appropriate.',
      'If information is missing, acknowledge it and guide the user on how to collect it.'
    ].join(' ');

    const contextPrompt = `Portfolio snapshot:\n${summaryLines.join('\n')}\n\nRecent trades:\n${recentLines}`;

    const reply = await createAssistantReply([
      { role: 'system', content: systemPrompt },
      { role: 'system', content: contextPrompt },
      ...sanitizedMessages
    ]);

    res.json({ message: reply });
  } catch (error) {
    const status = error instanceof AssistantError && typeof error.status === 'number'
      ? error.status
      : 500;
    const message = error instanceof AssistantError
      ? error.message
      : 'Failed to generate assistant response';

    if (!(error instanceof AssistantError)) {
      console.error('Failed to generate assistant response', error);
    }

    res.status(status).json({ message });
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

app.get('/api/announcements', async (req, res) => {
  try {
    let isAdmin = false;
    const scopeParam = typeof req.query.scope === 'string' ? req.query.scope : undefined;

    if (req.user) {
      try {
        const userRecord = await ensureUserRecord(req.user);
        isAdmin = userRecord.role === 'ADMIN';
      } catch (ensureError) {
        console.error('Failed to ensure user record for announcements list', ensureError);
      }
    }

    const includeAll = isAdmin && scopeParam === 'all';
    const now = new Date();
    const where = includeAll
      ? {}
      : {
          status: 'PUBLISHED',
          AND: [
            { OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] },
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
          ]
        };

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: [
        { publishedAt: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            email: true
          }
        }
      }
    });

    res.json(announcements.map(sanitizeAnnouncement));
  } catch (error) {
    console.error('Failed to fetch announcements', error);
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
});

app.get('/api/announcements/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            email: true
          }
        }
      }
    });

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    let isAdmin = false;
    if (req.user) {
      try {
        const userRecord = await ensureUserRecord(req.user);
        isAdmin = userRecord.role === 'ADMIN';
      } catch (ensureError) {
        console.error('Failed to ensure user record for announcement detail', ensureError);
      }
    }

    if (!isAdmin && !isAnnouncementVisible(announcement)) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json(sanitizeAnnouncement(announcement));
  } catch (error) {
    console.error('Failed to fetch announcement detail', error);
    res.status(500).json({ message: 'Failed to fetch announcement' });
  }
});

app.post('/api/announcements', requireAdmin, async (req, res) => {
  const { title, content, status = 'DRAFT', publishedAt, expiresAt } = req.body ?? {};

  if (typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ message: 'title is required' });
  }

  if (typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ message: 'content is required' });
  }

  const normalizedStatus = typeof status === 'string' ? status.toUpperCase() : 'DRAFT';
  if (!ANNOUNCEMENT_STATUS_SET.has(normalizedStatus)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  const publishedAtValue = parseOptionalDate(publishedAt);
  if (publishedAt !== undefined && publishedAt !== null && publishedAt !== '' && !publishedAtValue) {
    return res.status(400).json({ message: 'Invalid publishedAt value' });
  }

  const expiresAtValue = parseOptionalDate(expiresAt);
  if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '' && !expiresAtValue) {
    return res.status(400).json({ message: 'Invalid expiresAt value' });
  }

  try {
    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        status: normalizedStatus,
        publishedAt: publishedAtValue,
        expiresAt: expiresAtValue,
        authorId: req.user.id
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(sanitizeAnnouncement(announcement));
  } catch (error) {
    console.error('Failed to create announcement', error);
    res.status(500).json({ message: 'Failed to create announcement' });
  }
});

app.patch('/api/announcements/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, content, status, publishedAt, expiresAt } = req.body ?? {};

  try {
    const existing = await prisma.announcement.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            email: true
          }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    const data = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ message: 'title must be a non-empty string' });
      }
      data.title = title.trim();
    }

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ message: 'content must be a non-empty string' });
      }
      data.content = content.trim();
    }

    if (status !== undefined) {
      if (typeof status !== 'string') {
        return res.status(400).json({ message: 'status must be a string' });
      }
      const normalizedStatus = status.toUpperCase();
      if (!ANNOUNCEMENT_STATUS_SET.has(normalizedStatus)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }
      data.status = normalizedStatus;
    }

    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'publishedAt')) {
      const publishedAtValue = parseOptionalDate(publishedAt);
      if (publishedAt !== undefined && publishedAt !== null && publishedAt !== '' && !publishedAtValue) {
        return res.status(400).json({ message: 'Invalid publishedAt value' });
      }
      data.publishedAt = publishedAtValue;
    }

    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'expiresAt')) {
      const expiresAtValue = parseOptionalDate(expiresAt);
      if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '' && !expiresAtValue) {
        return res.status(400).json({ message: 'Invalid expiresAt value' });
      }
      data.expiresAt = expiresAtValue;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update' });
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data,
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            email: true
          }
        }
      }
    });

    res.json(sanitizeAnnouncement(updated));
  } catch (error) {
    console.error('Failed to update announcement', error);
    res.status(500).json({ message: 'Failed to update announcement' });
  }
});

app.delete('/api/announcements/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.announcement.delete({
      where: { id }
    });
    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    console.error('Failed to delete announcement', error);
    res.status(500).json({ message: 'Failed to delete announcement' });
  }
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


