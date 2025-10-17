import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Prisma, PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import multer from 'multer';
import { startMarketCacheScheduler, getMarketCache, refreshMarketCache } from './services/marketCache.js';
import PDFDocument from 'pdfkit';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fsPromises = fs.promises;

const uploadsRoot = path.join(__dirname, 'uploads');
const communityUploadsDir = path.join(uploadsRoot, 'community');
if (!fs.existsSync(communityUploadsDir)) {
  fs.mkdirSync(communityUploadsDir, { recursive: true });
}

const fontsRoot = path.join(__dirname, 'fonts');
const REPORT_FONT_NAME = 'TrakkoReportRegular';
const REPORT_FONT_PATH = path.join(fontsRoot, 'NanumGothic-Regular.ttf');
const REPORT_FONT_AVAILABLE = fs.existsSync(REPORT_FONT_PATH);

const COMMUNITY_IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const COMMUNITY_ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const FALLBACK_IMAGE_EXTENSION = '.jpg';

const communityImageStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, communityUploadsDir);
  },
  filename: (_req, file, callback) => {
    const rawExt = (path.extname(file.originalname) || '').toLowerCase();
    const safeExt = rawExt && ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(rawExt) ? rawExt : FALLBACK_IMAGE_EXTENSION;
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${safeExt}`;
    callback(null, uniqueName);
  }
});

const communityImageUpload = multer({
  storage: communityImageStorage,
  limits: {
    fileSize: COMMUNITY_IMAGE_MAX_SIZE
  },
  fileFilter: (_req, file, callback) => {
    if (COMMUNITY_ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error('이미지 파일만 업로드할 수 있습니다.'));
    }
  }
});

const removeFileIfExists = async (absolutePath) => {
  if (!absolutePath) return;
  try {
    await fsPromises.unlink(absolutePath);
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      console.warn('Failed to remove uploaded file', error);
    }
  }
};

const uploadCommunityImageMiddleware = (req, res, next) => {
  communityImageUpload.single('image')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (req.file?.path) {
      void removeFileIfExists(req.file.path);
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: '이미지는 최대 5MB까지 업로드할 수 있습니다.' });
      }
      return res.status(400).json({ message: '이미지를 업로드하지 못했습니다.' });
    }

    return res.status(400).json({ message: error.message || '이미지를 업로드하지 못했습니다.' });
  });
};

const buildCommunityImageUrl = (filename) => `/uploads/community/${filename}`;
const COMMUNITY_UPLOADS_PUBLIC_PREFIX = '/uploads/community/';

const resolveCommunityImageAbsolutePath = (imageUrl) => {
  if (typeof imageUrl !== 'string' || imageUrl.length === 0) {
    return null;
  }

  try {
    const parsed = new URL(imageUrl, 'http://localhost');
    if (!parsed.pathname.startsWith(COMMUNITY_UPLOADS_PUBLIC_PREFIX)) {
      return null;
    }
    const basename = path.basename(parsed.pathname);
    return basename ? path.join(communityUploadsDir, basename) : null;
  } catch (_error) {
    const relative = imageUrl.startsWith(COMMUNITY_UPLOADS_PUBLIC_PREFIX)
      ? imageUrl.slice(COMMUNITY_UPLOADS_PUBLIC_PREFIX.length)
      : imageUrl;
    const basename = path.basename(relative);
    return basename ? path.join(communityUploadsDir, basename) : null;
  }
};

const removeCommunityImageByUrl = async (imageUrl) => {
  const absolutePath = resolveCommunityImageAbsolutePath(imageUrl);
  if (absolutePath) {
    await removeFileIfExists(absolutePath);
  }
};

const mapCommunityPostForResponse = (post) => ({
  id: post.id,
  title: post.title,
  content: post.content,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  imageUrl: post.imageUrl ?? null,
  author: post.user
    ? {
        id: post.user.id,
        displayName: post.user.displayName ?? null,
        email: post.user.email ?? null,
        subscriptionTier: post.user.subscriptionTier
      }
    : null,
  commentCount: typeof post._count?.comments === 'number' ? post._count.comments : undefined
});

const envFilePath = process.env.SERVER_ENV_FILE
  ? path.resolve(process.env.SERVER_ENV_FILE)
  : path.join(__dirname, '.env');

dotenv.config({ path: envFilePath });

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
const GOAL_PERIOD_VALUES = ['MONTHLY', 'ANNUAL'];
const GOAL_PERIOD_SET = new Set(GOAL_PERIOD_VALUES);

startMarketCacheScheduler();

const SUPPORTED_CURRENCIES = new Set(['USD', 'KRW']);
const TRADER_TYPE_VALUES = ['CRYPTO', 'US_STOCK', 'KR_STOCK'];
const BASE_CURRENCY = 'KRW';
const currencyLocales = {
  USD: 'en-US',
  KRW: 'ko-KR'
};

const defaultPreferences = {
  currency: BASE_CURRENCY,
  locale: currencyLocales[BASE_CURRENCY]
};

const MARKET_SYMBOLS = [
  { id: 'btc', label: '비트코인 (BTC)', kind: 'crypto', coinId: 'bitcoin', unit: 'USD' },
  { id: 'eth', label: '이더리움 (ETH)', kind: 'crypto', coinId: 'ethereum', unit: 'USD' },
  { id: 'sp500', label: 'S&P 500', kind: 'stooq', stooqSymbol: '^spx' },
  { id: 'nasdaq', label: '나스닥 지수', kind: 'stooq', stooqSymbol: '^ndq' },
  { id: 'dji', label: '다우존스', kind: 'stooq', stooqSymbol: '^dji' },
  { id: 'nikkei', label: '니케이 225', kind: 'stooq', stooqSymbol: '^nkx' }
];

const MARKET_CACHE_TTL_MS = 60 * 1000;
const marketCache = new Map();

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

const formatYearLabel = (year, displayCurrency) => {
  const locale = currencyLocales[displayCurrency] ?? 'en-US';
  const formatter = new Intl.DateTimeFormat(locale, { year: 'numeric' });
  return formatter.format(new Date(year, 0, 1));
};

const roundCurrency = (value, currency) => {
  if (!Number.isFinite(value)) return 0;
  const fractionDigits = currency === 'KRW' ? 0 : 2;
  const factor = 10 ** fractionDigits;
  return Math.round(value * factor) / factor;
};

const decimalToNumber = (value) => {
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === 'object' && typeof value.valueOf === 'function') {
    const numeric = Number(value.valueOf());
    return Number.isFinite(numeric) ? numeric : 0;
  }
  return 0;
};

const formatCurrencyForUser = (value, currency, locale) => {
  const normalizedCurrency = normalizeCurrency(currency);
  const resolvedLocale = locale || currencyLocales[normalizedCurrency] || defaultPreferences.locale;
  const fractionDigits = normalizedCurrency === 'KRW' ? 0 : 2;
  try {
    const formatter = new Intl.NumberFormat(resolvedLocale, {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    });
    return formatter.format(roundCurrency(value, normalizedCurrency));
  } catch (error) {
    console.warn('Falling back to default locale for currency formatting', { resolvedLocale, normalizedCurrency, error });
    const fallbackFormatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCurrency === 'KRW' ? 'KRW' : 'USD',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    });
    return fallbackFormatter.format(roundCurrency(value, normalizedCurrency));
  }
};

const formatPercentForUser = (value, locale) => {
  if (!Number.isFinite(value)) return 'N/A';
  const resolvedLocale = locale || defaultPreferences.locale;
  try {
    const formatter = new Intl.NumberFormat(resolvedLocale, {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
    return formatter.format(value / 100);
  } catch (error) {
    console.warn('Falling back to default locale for percent formatting', { resolvedLocale, error });
    const fallbackFormatter = new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
    return fallbackFormatter.format(value / 100);
  }
};

const formatMonthForLocale = (year, month, locale) => {
  const resolvedLocale = locale || defaultPreferences.locale;
  const date = new Date(year, month - 1, 1);
  try {
    const formatter = new Intl.DateTimeFormat(resolvedLocale, { year: 'numeric', month: 'long' });
    return formatter.format(date);
  } catch (error) {
    console.warn('Falling back to default locale for month formatting', { resolvedLocale, error });
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' }).format(date);
  }
};

const formatDateForLocale = (date, locale) => {
  const resolvedLocale = locale || defaultPreferences.locale;
  try {
    return new Intl.DateTimeFormat(resolvedLocale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
  } catch (error) {
    console.warn('Falling back to default locale for date formatting', { resolvedLocale, error });
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
  }
};

const PDF_THEME = {
  heading: '#1f2933',
  body: '#243447',
  muted: '#6c7a89',
  rule: '#d9e2ec'
};

const getContentWidth = (doc) => doc.page.width - doc.page.margins.left - doc.page.margins.right;

const drawDivider = (doc) => {
  const contentWidth = getContentWidth(doc);
  doc.moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.margins.left + contentWidth, doc.y)
    .strokeColor(PDF_THEME.rule)
    .lineWidth(0.6)
    .stroke();
  doc.moveDown(0.2);
  doc.strokeColor(PDF_THEME.body);
};

const drawSectionHeading = (doc, text) => {
  doc.moveDown(0.35);
  doc.fillColor(PDF_THEME.heading).fontSize(11).text(text);
  drawDivider(doc);
  doc.fillColor(PDF_THEME.body).fontSize(10);
};

const drawMetricsGrid = (doc, metrics) => {
  metrics.forEach((metric) => {
    doc.fontSize(8.5).fillColor(PDF_THEME.muted).text(metric.label);
    doc.fontSize(11).fillColor(PDF_THEME.body).text(metric.value, {
      indent: 10
    });
    if (metric.note) {
      doc.fontSize(8).fillColor(PDF_THEME.muted).text(metric.note, { indent: 10 });
    }
    doc.moveDown(0.25);
  });

  doc.fillColor(PDF_THEME.body).fontSize(10);
  doc.moveDown(0.2);
};


const ensurePageSpace = (doc, requiredHeight = 70) => {
  const remaining = doc.page.height - doc.page.margins.bottom - doc.y;
  if (remaining < requiredHeight) {
    doc.addPage();
    doc.fillColor(PDF_THEME.body).fontSize(11);
  }
};

const REPORT_GRANULARITY_VALUES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const REPORT_GRANULARITY_SET = new Set(REPORT_GRANULARITY_VALUES);

const normalizeReportGranularity = (value) => {
  if (typeof value !== 'string') return 'MONTHLY';
  const upper = value.toUpperCase();
  return REPORT_GRANULARITY_SET.has(upper) ? upper : 'MONTHLY';
};

const parseDateOnly = (value) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parts = value.split('-').map(Number);
  if (parts.length !== 3) {
    return null;
  }

  const [year, month, day] = parts;
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
};

const buildDefaultReportRange = (granularity) => {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let start = new Date(end);

  switch (granularity) {
    case 'DAILY':
      break;
    case 'WEEKLY': {
      start = new Date(end);
      const dayOfWeek = start.getDay();
      const diff = dayOfWeek; // Sunday=0
      start.setDate(start.getDate() - diff);
      break;
    }
    case 'MONTHLY':
      start = new Date(end.getFullYear(), end.getMonth(), 1);
      break;
    case 'YEARLY':
      start = new Date(end.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(end.getFullYear(), end.getMonth(), 1);
  }

  return { start, end };
};

const formatReportGroupLabel = (group, granularity, locale) => {
  const effectiveLocale = locale || defaultPreferences.locale;
  if (granularity === 'DAILY' && group.date) {
    return formatDateForLocale(group.date, effectiveLocale);
  }
  if (granularity === 'MONTHLY' && Number.isInteger(group.year) && Number.isInteger(group.month)) {
    return formatMonthForLocale(group.year, group.month, effectiveLocale);
  }
  if (Number.isInteger(group.year)) {
    try {
      return new Intl.DateTimeFormat(effectiveLocale, { year: 'numeric' }).format(new Date(group.year, 0, 1));
    } catch (error) {
      console.warn('Falling back to default locale for year formatting', { effectiveLocale, error });
      return new Intl.DateTimeFormat('en-US', { year: 'numeric' }).format(new Date(group.year, 0, 1));
    }
  }
  return '';
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

function normalizeTraderType(value) {
  if (typeof value !== 'string') return 'KR_STOCK';
  const upper = value.toUpperCase().replace(/-/g, '_');
  return TRADER_TYPE_VALUES.includes(upper) ? upper : 'KR_STOCK';
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
      ...(shouldGrantAdmin ? { role: 'ADMIN', subscriptionTier: 'PRO' } : {})
    },
    create: {
      id: sessionUser.id,
      displayName: sessionUser.displayName ?? null,
      email: sessionUser.email ?? null,
      baseCurrency: BASE_CURRENCY,
      traderType: 'KR_STOCK',
      role: shouldGrantAdmin ? 'ADMIN' : undefined,
      subscriptionTier: shouldGrantAdmin ? 'PRO' : undefined,
      preferences: {
        create: defaultPreferences
      }
    }
  });

  sessionUser.displayName = userRecord.displayName ?? sessionUser.displayName ?? '';
  sessionUser.email = userRecord.email ?? sessionUser.email;
  sessionUser.role = userRecord.role;
  sessionUser.subscriptionTier = userRecord.subscriptionTier;
  sessionUser.traderType = userRecord.traderType;

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
    rationale: trade.rationale ?? null,
    entryRationale: trade.entryRationale ?? null,
    exitRationale: trade.exitRationale ?? null,
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
    performanceGoal,
    traderType: normalizeTraderType(user.traderType ?? 'KR_STOCK')
  };
}

async function buildPerformanceGoalSummary({ userId, baseCurrency, displayCurrency, trades, year, month }) {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const achievedMonthlyRaw = trades
    .filter((trade) => trade.tradeDate?.startsWith(monthKey))
    .reduce((acc, trade) => acc + trade.profitLoss, 0);
  const achievedAnnualRaw = trades
    .filter((trade) => trade.tradeDate?.startsWith(`${year}-`))
    .reduce((acc, trade) => acc + trade.profitLoss, 0);

  const achievedMonthly = roundCurrency(achievedMonthlyRaw, displayCurrency);
  const achievedAnnual = roundCurrency(achievedAnnualRaw, displayCurrency);

  const monthLabel = formatMonthLabel(year, month, displayCurrency);
  const yearLabel = formatYearLabel(year, displayCurrency);

  const [monthlyGoalRecord, annualGoalRecord] = await Promise.all([
    prisma.performanceGoal.findUnique({
      where: {
        userId_period_targetYear_targetMonth: {
          userId,
          period: 'MONTHLY',
          targetYear: year,
          targetMonth: month
        }
      }
    }),
    prisma.performanceGoal.findUnique({
      where: {
        userId_period_targetYear_targetMonth: {
          userId,
          period: 'ANNUAL',
          targetYear: year,
          targetMonth: 0
        }
      }
    })
  ]);

  const buildSection = async (period, goalRecord, achievedAmount, label, monthValue) => {
    const base = {
      period,
      goal: null,
      achievedAmount,
      remainingAmount: null,
      progressPercent: null,
      timeFrame: {
        year,
        month: typeof monthValue === 'number' ? monthValue : null,
        label
      }
    };

    if (!goalRecord) {
      return base;
    }

    const targetAmountBase = Number(goalRecord.targetAmount);
    const targetAmountDisplayRaw = await convertAmount(targetAmountBase, baseCurrency, displayCurrency);
    const targetAmountDisplay = roundCurrency(targetAmountDisplayRaw, displayCurrency);
    const remainingAmount = roundCurrency(targetAmountDisplay - achievedAmount, displayCurrency);
    const progressRatio = targetAmountDisplay > 0 ? (achievedAmount / targetAmountDisplay) * 100 : null;
    const progressPercent = progressRatio !== null
      ? Math.round(Math.min(100, Math.max(0, progressRatio)) * 100) / 100
      : null;

    return {
      ...base,
      goal: {
        id: goalRecord.id,
        targetAmount: targetAmountDisplay,
        currency: displayCurrency,
        targetYear: goalRecord.targetYear,
        targetMonth: goalRecord.targetMonth === 0 ? null : goalRecord.targetMonth,
        period: goalRecord.period
      },
      remainingAmount,
      progressPercent
    };
  };

  const [monthlySummary, annualSummary] = await Promise.all([
    buildSection('MONTHLY', monthlyGoalRecord, achievedMonthly, monthLabel, month),
    buildSection('ANNUAL', annualGoalRecord, achievedAnnual, yearLabel, null)
  ]);

  return {
    monthly: monthlySummary,
    annual: annualSummary
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
    traderType: portfolio.traderType,
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
      role: userRecord.role,
      subscriptionTier: userRecord.subscriptionTier,
      traderType: normalizeTraderType(userRecord.traderType ?? 'KR_STOCK')
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
    const { initialSeed, currency, traderType } = req.body ?? {};
    const seedValue = Number(initialSeed);

    if (!Number.isFinite(seedValue) || seedValue <= 0) {
      return res.status(400).json({ message: 'initialSeed must be a positive number' });
    }

    const MAX_SEED = Number('999999999999999.99');
    if (seedValue > MAX_SEED) {
      return res.status(400).json({ message: '초기 자본은 최대 999,999,999,999,999.99까지 입력할 수 있습니다.' });
    }

    const sessionUser = req.user;
    await ensureUserRecord(sessionUser);
    const user = await getUserWithRelations(sessionUser.id);
    const baseCurrency = normalizeCurrency(user.baseCurrency ?? BASE_CURRENCY);
    const sourceCurrency = normalizeCurrency(currency ?? user.preferences.currency ?? baseCurrency);
    const seedValueInBase = await convertAmount(seedValue, sourceCurrency, baseCurrency);

    if (seedValueInBase > MAX_SEED) {
      return res.status(400).json({ message: '초기 자본은 최대 999,999,999,999,999.99까지 입력할 수 있습니다.' });
    }

    const currentTraderType = normalizeTraderType(user.traderType ?? 'KR_STOCK');
    const normalizedTraderType = traderType !== undefined
      ? normalizeTraderType(traderType)
      : currentTraderType;

    try {
      await prisma.user.update({
        where: { id: sessionUser.id },
        data: {
          initialSeed: new Prisma.Decimal(seedValueInBase.toFixed(2)),
          baseCurrency,
          traderType: normalizedTraderType
        }
      });
    } catch (updateError) {
      if (updateError instanceof Prisma.PrismaClientKnownRequestError && updateError.code === 'P2020') {
        return res.status(400).json({ message: '초기 자본은 최대 999,999,999,999,999.99까지 입력할 수 있습니다.' });
      }
      throw updateError;
    }

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
      rationale,
      entryRationale,
      exitRationale,
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
    const MAX_PROFIT_LOSS = Number('999999999999999.99');
    if (profitLossInBase > MAX_PROFIT_LOSS || profitLossInBase < -MAX_PROFIT_LOSS) {
      return res.status(400).json({ message: '손익 금액은 ±999,999,999,999,999.99 범위 내에서 입력할 수 있습니다.' });
    }

    const createdTrade = await prisma.trade.create({
      data: {
        userId: sessionUser.id,
        ticker: ticker.trim().toUpperCase(),
        profitLoss: new Prisma.Decimal(profitLossInBase.toFixed(2)),
        rationale: rationale !== undefined && rationale !== null ? String(rationale) : null,
        entryRationale: entryRationale !== undefined && entryRationale !== null ? String(entryRationale) : null,
        exitRationale: exitRationale !== undefined && exitRationale !== null ? String(exitRationale) : null,
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
      rationale,
      entryRationale,
      exitRationale,
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

    const existingTrade = await prisma.trade.findUnique({ where: { id: tradeId } });
    if (!existingTrade || existingTrade.userId !== sessionUser.id) {
      return res.status(404).json({ message: '거래를 찾을 수 없습니다.' });
    }

    const baseCurrency = normalizeCurrency(user.baseCurrency ?? BASE_CURRENCY);
    const displayCurrency = normalizeCurrency(user.preferences?.currency ?? baseCurrency);
    const sourceCurrency = normalizeCurrency(currency ?? displayCurrency);
    const profitLossInBase = await convertAmount(profitLossValue, sourceCurrency, baseCurrency);
    const MAX_PROFIT_LOSS = Number('999999999999999.99');
    if (profitLossInBase > MAX_PROFIT_LOSS || profitLossInBase < -MAX_PROFIT_LOSS) {
      return res.status(400).json({ message: '손익 금액은 ±999,999,999,999,999.99 범위 내에서 입력할 수 있습니다.' });
    }

    const updatedTrade = await prisma.trade.update({
      where: { id: tradeId },
      data: {
        ticker: ticker.trim().toUpperCase(),
        profitLoss: new Prisma.Decimal(profitLossInBase.toFixed(2)),
        rationale: rationale !== undefined && rationale !== null ? String(rationale) : null,
        entryRationale: entryRationale !== undefined && entryRationale !== null ? String(entryRationale) : null,
        exitRationale: exitRationale !== undefined && exitRationale !== null ? String(exitRationale) : null,
        tradeDate: new Date(`${tradeDate}T00:00:00.000Z`)
      }
    });

    const response = await mapTradeForResponse(updatedTrade, baseCurrency, displayCurrency);
    res.json(response);
  } catch (error) {
    console.error('Failed to update trade', error);
    res.status(500).json({ message: 'Failed to update trade' });
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

app.get('/api/community/posts', async (_req, res) => {
  try {
    const posts = await prisma.communityPost.findMany({
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            subscriptionTier: true
          }
        },
        _count: {
          select: { comments: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const sanitized = posts.map(mapCommunityPostForResponse);

    res.json(sanitized);
  } catch (error) {
    console.error('Failed to read community posts', error);
    res.status(500).json({ message: '커뮤니티 게시글을 불러오지 못했습니다.' });
  }
});

app.post('/api/community/posts', requireAuth, uploadCommunityImageMiddleware, async (req, res) => {
  const uploadedFilePath = req.file?.path ?? null;
  try {
    const sessionUser = req.user;
    await ensureUserRecord(sessionUser);
    const { title, content } = req.body ?? {};

    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    const trimmedContent = typeof content === 'string' ? content.trim() : '';

    if (trimmedTitle.length === 0) {
      if (uploadedFilePath) {
        await removeFileIfExists(uploadedFilePath);
      }
      return res.status(400).json({ message: '제목을 입력해주세요.' });
    }
    if (trimmedContent.length === 0) {
      if (uploadedFilePath) {
        await removeFileIfExists(uploadedFilePath);
      }
      return res.status(400).json({ message: '본문을 입력해주세요.' });
    }

    const imageUrl = req.file?.filename ? buildCommunityImageUrl(req.file.filename) : null;

    const created = await prisma.communityPost.create({
      data: {
        userId: sessionUser.id,
        title: trimmedTitle.slice(0, 200),
        content: trimmedContent,
        imageUrl
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            subscriptionTier: true
          }
        }
      }
    });

    res.status(201).json(mapCommunityPostForResponse(created));
  } catch (error) {
    if (uploadedFilePath) {
      await removeFileIfExists(uploadedFilePath);
    }
    console.error('Failed to create community post', error);
    res.status(500).json({ message: '게시글을 등록하지 못했습니다.' });
  }
});

app.get('/api/community/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            subscriptionTier: true
          }
        },
        _count: {
          select: { comments: true }
        }
      }
    });

    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    res.json(mapCommunityPostForResponse(post));
  } catch (error) {
    console.error('Failed to read community post', error);
    res.status(500).json({ message: '게시글을 불러오지 못했습니다.' });
  }
});

app.patch('/api/community/posts/:postId', requireAuth, uploadCommunityImageMiddleware, async (req, res) => {
  const uploadedFilePath = req.file?.path ?? null;
  try {
    const { postId } = req.params;
    const sessionUser = req.user;
    await ensureUserRecord(sessionUser);

    const existing = await prisma.communityPost.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            subscriptionTier: true
          }
        }
      }
    });

    if (!existing) {
      if (uploadedFilePath) {
        await removeFileIfExists(uploadedFilePath);
      }
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    const isOwner = existing.userId === sessionUser.id;
    const isAdmin = sessionUser.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      if (uploadedFilePath) {
        await removeFileIfExists(uploadedFilePath);
      }
      return res.status(403).json({ message: '게시글을 수정할 수 있는 권한이 없습니다.' });
    }

    const { title, content, removeImage } = req.body ?? {};
    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    const trimmedContent = typeof content === 'string' ? content.trim() : '';

    if (trimmedTitle.length === 0) {
      if (uploadedFilePath) {
        await removeFileIfExists(uploadedFilePath);
      }
      return res.status(400).json({ message: '제목을 입력해주세요.' });
    }
    if (trimmedContent.length === 0) {
      if (uploadedFilePath) {
        await removeFileIfExists(uploadedFilePath);
      }
      return res.status(400).json({ message: '본문을 입력해주세요.' });
    }

    const removeImageRequested = typeof removeImage === 'string'
      ? removeImage.toLowerCase() === 'true'
      : Boolean(removeImage);

    let nextImageUrl = existing.imageUrl ?? null;
    let shouldRemovePrevious = false;

    if (req.file?.filename) {
      nextImageUrl = buildCommunityImageUrl(req.file.filename);
      shouldRemovePrevious = Boolean(existing.imageUrl);
    } else if (removeImageRequested) {
      nextImageUrl = null;
      shouldRemovePrevious = Boolean(existing.imageUrl);
    }

    const updated = await prisma.communityPost.update({
      where: { id: postId },
      data: {
        title: trimmedTitle.slice(0, 200),
        content: trimmedContent,
        imageUrl: nextImageUrl
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            subscriptionTier: true
          }
        }
      }
    });

    if (shouldRemovePrevious && existing.imageUrl) {
      await removeCommunityImageByUrl(existing.imageUrl);
    }

    res.json(mapCommunityPostForResponse(updated));
  } catch (error) {
    if (uploadedFilePath) {
      await removeFileIfExists(uploadedFilePath);
    }
    console.error('Failed to update community post', error);
    res.status(500).json({ message: '게시글을 수정하지 못했습니다.' });
  }
});

app.delete('/api/community/posts/:postId', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const sessionUser = req.user;
    await ensureUserRecord(sessionUser);

    const existing = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!existing) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    const isOwner = existing.userId === sessionUser.id;
    const isAdmin = sessionUser.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: '게시글을 삭제할 수 있는 권한이 없습니다.' });
    }

    await prisma.communityPost.delete({ where: { id: postId } });

    if (existing.imageUrl) {
      await removeCommunityImageByUrl(existing.imageUrl);
    }

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete community post', error);
    res.status(500).json({ message: '게시글을 삭제하지 못했습니다.' });
  }
});

app.get('/api/community/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    const comments = await prisma.communityComment.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            subscriptionTier: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const mapped = comments.map((comment) => ({
      id: comment.id,
      postId: comment.postId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: comment.user
        ? {
            id: comment.user.id,
            displayName: comment.user.displayName ?? null,
            email: comment.user.email ?? null,
            subscriptionTier: comment.user.subscriptionTier
          }
        : null
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Failed to read community comments', error);
    res.status(500).json({ message: '댓글을 불러오지 못했습니다.' });
  }
});

app.post('/api/community/posts/:postId/comments', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const sessionUser = req.user;
    await ensureUserRecord(sessionUser);

    const { content } = req.body ?? {};
    if (typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ message: '댓글 내용을 입력해주세요.' });
    }

    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    const created = await prisma.communityComment.create({
      data: {
        postId,
        userId: sessionUser.id,
        content: content.trim()
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            subscriptionTier: true
          }
        }
      }
    });

    res.status(201).json({
      id: created.id,
      postId: created.postId,
      content: created.content,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      author: created.user
        ? {
            id: created.user.id,
            displayName: created.user.displayName ?? null,
            email: created.user.email ?? null,
            subscriptionTier: created.user.subscriptionTier
          }
        : null
    });
  } catch (error) {
    console.error('Failed to create community comment', error);
    res.status(500).json({ message: '댓글을 등록하지 못했습니다.' });
  }
});

app.post('/api/profile/trader-type', requireAuth, async (req, res) => {
  try {
    const { traderType } = req.body ?? {};
    if (typeof traderType !== 'string') {
      return res.status(400).json({ message: 'traderType is required' });
    }

    const normalized = normalizeTraderType(traderType);

    const sessionUser = req.user;
    await ensureUserRecord(sessionUser);

    const updated = await prisma.user.update({
      where: { id: sessionUser.id },
      data: { traderType: normalized }
    });

    sessionUser.traderType = updated.traderType;

    res.json({ traderType: updated.traderType });
  } catch (error) {
    console.error('Failed to update trader type', error);
    res.status(500).json({ message: '거래 유형을 변경하지 못했습니다.' });
  }
});

app.get('/api/markets/indices', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === '1';
    const cache = getMarketCache();
    if (forceRefresh || cache.quotes.length === 0) {
      const refreshed = await refreshMarketCache();
      if (refreshed.fetchedAt) {
        res.set('X-Cache-Timestamp', refreshed.fetchedAt);
      }
      res.json(refreshed.quotes);
      return;
    }
    if (cache.fetchedAt) {
      res.set('X-Cache-Timestamp', cache.fetchedAt);
    }
    res.json(cache.quotes);
  } catch (error) {
    console.error('Failed to read market indices cache', error);
    res.status(503).json({ message: '시장 데이터를 불러오지 못했습니다.' });
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
      month,
      period
    } = req.body ?? {};

    const amountValue = Number(targetAmount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return res.status(400).json({ message: 'targetAmount must be a positive number' });
    }

    const periodInput = typeof period === 'string' ? period.toUpperCase() : 'MONTHLY';
    const normalizedPeriod = GOAL_PERIOD_SET.has(periodInput) ? periodInput : 'MONTHLY';

    const { year: targetYear, month: targetMonthCandidate } = clampYearMonth(Number(year), Number(month));
    const targetMonth = normalizedPeriod === 'ANNUAL' ? 0 : targetMonthCandidate;

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
        userId_period_targetYear_targetMonth: {
          userId: sessionUser.id,
          period: normalizedPeriod,
          targetYear,
          targetMonth
        }
      },
      update: {
        targetAmount: new Prisma.Decimal(amountInBase.toFixed(2)),
        currency: baseCurrency,
        period: normalizedPeriod,
        targetMonth
      },
      create: {
        userId: sessionUser.id,
        targetYear,
        targetMonth,
        targetAmount: new Prisma.Decimal(amountInBase.toFixed(2)),
        currency: baseCurrency,
        period: normalizedPeriod
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
    const { year, month, period } = req.query ?? {};
    const periodInput = typeof period === 'string' ? period.toUpperCase() : 'MONTHLY';
    const normalizedPeriod = GOAL_PERIOD_SET.has(periodInput) ? periodInput : 'MONTHLY';
    const { year: targetYear, month: targetMonthCandidate } = clampYearMonth(Number(year), Number(month));
    const targetMonth = normalizedPeriod === 'ANNUAL' ? 0 : targetMonthCandidate;

    const sessionUser = req.user;
    await ensureUserRecord(sessionUser);

    const existingGoal = await prisma.performanceGoal.findUnique({
      where: {
        userId_period_targetYear_targetMonth: {
          userId: sessionUser.id,
          period: normalizedPeriod,
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

    const traderPrompt = (() => {
      switch (summary.traderType) {
        case 'CRYPTO':
          return [
            '사용자는 암호화폐 트레이더입니다. 코인 변동성, 온체인 흐름, 레버리지 관리 팁을 강조하세요.',
            '특정 코인에 대한 언급 시 항상 변동성·리스크 경고를 포함하세요.'
          ].join(' ');
        case 'US_STOCK':
          return [
            '사용자는 미국주식 트레이더입니다. 지수 흐름, 실적 시즌 일정, 거시 지표 영향을 중심으로 조언하세요.',
            '환율과 글로벌 이벤트가 포지션에 미치는 영향을 함께 언급하세요.'
          ].join(' ');
        case 'KR_STOCK':
        default:
          return [
            '사용자는 한국주식 트레이더입니다. 환율, 외국인 수급, 섹터 로테이션에 주목하도록 안내하세요.',
            '국내 시장 특성에 맞는 리스크 관리 포인트를 함께 제시하세요.'
          ].join(' ');
      }
    })();

    const systemPrompt = [
      'You are Trakko, an investment journal assistant that offers actionable trading insights.',
      'Respond in Korean using concise sentences without Markdown syntax, bullets, or bold styling.',
      'Clearly separate sections with short headings such as "[요약]" or "[다음 조치]".',
      'Highlight risk management tips, pattern recognition, and next-step suggestions with plain sentences.',
      'If information is missing, acknowledge it and guide the user on how to collect it.',
      traderPrompt
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

app.post('/api/reports/performance', requireAuth, async (req, res) => {
  const sessionUser = req.user;
  if (!sessionUser?.id) {
    return res.status(401).json({ message: '인증 정보가 올바르지 않습니다.' });
  }

  try {
    await ensureUserRecord(sessionUser);

    const body = req.body ?? {};
    const granularity = normalizeReportGranularity(body.granularity);
    const requestedStart = parseDateOnly(body.startDate);
    const requestedEnd = parseDateOnly(body.endDate);
    const defaultRange = buildDefaultReportRange(granularity);
    const rangeStart = requestedStart ?? defaultRange.start;
    const rangeEnd = requestedEnd ?? defaultRange.end;

    const rangeStartBound = new Date(rangeStart);
    rangeStartBound.setHours(0, 0, 0, 0);
    const rangeEndBound = new Date(rangeEnd);
    rangeEndBound.setHours(23, 59, 59, 999);

    if (rangeStartBound > rangeEndBound) {
      return res.status(400).json({ message: '시작일이 종료일보다 늦을 수 없습니다.' });
    }

    const tradeDateFilter = {};
    if (!Number.isNaN(rangeStartBound.getTime())) {
      tradeDateFilter.gte = rangeStartBound;
    }
    if (!Number.isNaN(rangeEndBound.getTime())) {
      tradeDateFilter.lte = rangeEndBound;
    }

    const tradeWhere = {
      userId: sessionUser.id,
      ...(Object.keys(tradeDateFilter).length > 0 ? { tradeDate: tradeDateFilter } : {})
    };

    const [userRecord, trades, goals, priorPnLAggregate, cumulativePnLAggregate] = await Promise.all([
      prisma.user.findUnique({
        where: { id: sessionUser.id },
        select: {
          displayName: true,
          email: true,
          initialSeed: true,
          baseCurrency: true,
          traderType: true,
          preferences: {
            select: {
              currency: true,
              locale: true
            }
          }
        }
      }),
      prisma.trade.findMany({
        where: tradeWhere,
        orderBy: { tradeDate: 'asc' }
      }),
      prisma.performanceGoal.findMany({
        where: { userId: sessionUser.id },
        orderBy: [{ updatedAt: 'desc' }],
        take: 1
      }),
      prisma.trade.aggregate({
        where: {
          userId: sessionUser.id,
          tradeDate: { lt: rangeStartBound }
        },
        _sum: { profitLoss: true }
      }),
      prisma.trade.aggregate({
        where: {
          userId: sessionUser.id,
          tradeDate: { lte: rangeEndBound }
        },
        _sum: { profitLoss: true }
      })
    ]);

    if (!userRecord) {
      return res.status(404).json({ message: '사용자 정보를 찾을 수 없습니다.' });
    }

    const baseCurrency = normalizeCurrency(userRecord.baseCurrency ?? BASE_CURRENCY);
    const preferredCurrency = userRecord.preferences?.currency ?? baseCurrency ?? defaultPreferences.currency;
    const normalizedCurrency = normalizeCurrency(preferredCurrency);
    const resolvedLocale = userRecord.preferences?.locale ?? currencyLocales[normalizedCurrency] ?? defaultPreferences.locale;

    const hasInitialSeed = userRecord.initialSeed !== null && userRecord.initialSeed !== undefined;
    const baseInitialSeed = decimalToNumber(userRecord.initialSeed);
    const priorPnL = decimalToNumber(priorPnLAggregate._sum?.profitLoss ?? 0);
    const cumulativePnL = decimalToNumber(cumulativePnLAggregate._sum?.profitLoss ?? 0);

    let totalPnL = 0;
    let wins = 0;
    let losses = 0;

    let bestTrade = null;
    let worstTrade = null;

    const groupMap = new Map();

    for (const trade of trades) {
      const pnl = decimalToNumber(trade.profitLoss);
      totalPnL += pnl;

      if (pnl >= 0) {
        wins += 1;
      } else {
        losses += 1;
      }

      if (!bestTrade || pnl > bestTrade.pnl) {
        bestTrade = {
          ticker: trade.ticker,
          tradeDate: trade.tradeDate,
          pnl
        };
      }

      if (!worstTrade || pnl < worstTrade.pnl) {
        worstTrade = {
          ticker: trade.ticker,
          tradeDate: trade.tradeDate,
          pnl
        };
      }

      const tradeDate = new Date(trade.tradeDate);
      if (Number.isNaN(tradeDate.getTime())) {
        continue;
      }
      tradeDate.setHours(0, 0, 0, 0);

      let groupKey;
      let sortValue;
      let seed = {};

      if (granularity === 'DAILY') {
        sortValue = tradeDate.getTime();
        groupKey = sortValue;
        seed = { date: new Date(tradeDate) };
      } else if (granularity === 'MONTHLY') {
        const year = tradeDate.getFullYear();
        const month = tradeDate.getMonth() + 1;
        groupKey = `${year}-${month}`;
        sortValue = year * 100 + month;
        seed = { year, month };
      } else {
        const year = tradeDate.getFullYear();
        groupKey = `${year}`;
        sortValue = year;
        seed = { year };
      }

      const existing = groupMap.get(groupKey) ?? {
        ...seed,
        pnl: 0,
        trades: 0,
        wins: 0,
        losses: 0,
        sortValue
      };
      existing.pnl += pnl;
      existing.trades += 1;
      if (pnl >= 0) {
        existing.wins += 1;
      } else {
        existing.losses += 1;
      }
      groupMap.set(groupKey, existing);
    }

    const periodPnL = totalPnL;
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : null;
    const periodStartCapital = baseInitialSeed + priorPnL;
    const periodEndCapital = baseInitialSeed + cumulativePnL;

    const groupSummaries = Array.from(groupMap.values()).sort((a, b) => a.sortValue - b.sortValue);
    const maxGroups = (() => {
      switch (granularity) {
        case 'DAILY':
          return 31;
        case 'WEEKLY':
          return 12;
        case 'MONTHLY':
          return 12;
        default:
          return 5;
      }
    })();
    const limitedGroupSummaries = groupSummaries.slice(-maxGroups);

    const granularityLabel = (() => {
      switch (granularity) {
        case 'DAILY':
          return '일간';
        case 'WEEKLY':
          return '주간';
        case 'YEARLY':
          return '연간';
        default:
          return '월간';
      }
    })();

    const rangeStartDate = new Date(rangeStartBound.getFullYear(), rangeStartBound.getMonth(), rangeStartBound.getDate());
    const rangeEndDate = new Date(rangeEndBound.getFullYear(), rangeEndBound.getMonth(), rangeEndBound.getDate());

    const latestGoal = goals[0] ?? null;

    const convertToDisplay = (value) => convertAmount(value, baseCurrency, normalizedCurrency);

    const [
      initialSeedDisplay,
      periodStartCapitalDisplay,
      periodEndCapitalDisplay,
      periodPnLDisplay,
      cumulativePnLDisplay
    ] = await Promise.all([
      hasInitialSeed ? convertToDisplay(baseInitialSeed) : Promise.resolve(null),
      convertToDisplay(periodStartCapital),
      convertToDisplay(periodEndCapital),
      convertToDisplay(periodPnL),
      convertToDisplay(cumulativePnL)
    ]);

    const bestTradeDisplayPnL = bestTrade ? await convertToDisplay(bestTrade.pnl) : null;
    const worstTradeDisplayPnL = worstTrade ? await convertToDisplay(worstTrade.pnl) : null;

    const limitedGroupSummariesDisplay = await Promise.all(
      limitedGroupSummaries.map(async (entry) => ({
        ...entry,
        displayPnl: await convertToDisplay(entry.pnl)
      }))
    );
    const latestGoalAmountBase = latestGoal ? decimalToNumber(latestGoal.targetAmount) : null;
    const latestGoalAmountDisplay = latestGoalAmountBase !== null ? await convertToDisplay(latestGoalAmountBase) : null;

    let aiInsights = null;

    if (openaiClient) {
      const groupHighlights = limitedGroupSummariesDisplay
        .map((entry) => {
          const label = formatReportGroupLabel(entry, granularity, resolvedLocale);
          const pnlText = formatCurrencyForUser(entry.displayPnl, normalizedCurrency, resolvedLocale);
          const tradesText = `${entry.trades}건`;
          const winRatioText = entry.trades > 0 ? `${Math.round((entry.wins / entry.trades) * 100)}%` : '데이터 없음';
          return `${label} — 손익 ${pnlText}, 거래 ${tradesText}, 승률 ${winRatioText}`;
        })
        .join('\n');

      const highlightLines = [];
      if (bestTrade && bestTradeDisplayPnL !== null) {
        const bestDate = formatDateForLocale(new Date(bestTrade.tradeDate), resolvedLocale);
        highlightLines.push(
          `최고 거래: ${bestTrade.ticker} (${bestDate}) 손익 ${formatCurrencyForUser(bestTradeDisplayPnL, normalizedCurrency, resolvedLocale)}`
        );
      }
      if (worstTrade && worstTradeDisplayPnL !== null) {
        const worstDate = formatDateForLocale(new Date(worstTrade.tradeDate), resolvedLocale);
        highlightLines.push(
          `어려웠던 거래: ${worstTrade.ticker} (${worstDate}) 손익 ${formatCurrencyForUser(worstTradeDisplayPnL, normalizedCurrency, resolvedLocale)}`
        );
      }

      const aiContext = [
        `기간: ${formatDateForLocale(rangeStartDate, resolvedLocale)} ~ ${formatDateForLocale(rangeEndDate, resolvedLocale)}`,
        `집계 단위: ${granularityLabel}`,
        `기간 시작 자본: ${formatCurrencyForUser(periodStartCapitalDisplay, normalizedCurrency, resolvedLocale)}`,
        `기간 종료 자본: ${formatCurrencyForUser(periodEndCapitalDisplay, normalizedCurrency, resolvedLocale)}`,
        `기간 손익: ${formatCurrencyForUser(periodPnLDisplay, normalizedCurrency, resolvedLocale)}`,
        `누적 손익(전체): ${formatCurrencyForUser(cumulativePnLDisplay, normalizedCurrency, resolvedLocale)}`,
        `총 거래 수: ${totalTrades}`,
        `승수/패수: ${wins} / ${losses}`,
        `승률: ${winRate !== null ? formatPercentForUser(winRate, resolvedLocale) : '데이터 없음'}`,
        latestGoal
          ? `설정된 목표: ${latestGoal.period === 'ANNUAL' ? '연간' : '월간'} 기준 ${formatCurrencyForUser(latestGoalAmountDisplay ?? 0, normalizedCurrency, resolvedLocale)}`
          : '설정된 목표 없음'
      ].join('\n');

      const aiMessages = [
        {
          role: 'system',
          content: [
            'You are Trakko, an AI analyst for trading performance reports.',
            'Respond in Korean with concise paragraphs (no bullet lists).',
            'Include headings such as "[요약]", "[성과 분석]", "[다음 전략]" to structure the response.',
            'Focus on risk management, repeatable strengths, and actionable improvements.',
            'If data is insufficient, mention what additional information would help.',
            'Keep the entire response under 250 Korean characters per section if possible.'
          ].join(' ')
        },
        {
          role: 'system',
          content: [
            '성과 데이터 개요:',
            aiContext,
            groupHighlights ? `구간별 요약:\n${groupHighlights}` : '구간별 데이터가 충분하지 않습니다.',
            highlightLines.length > 0 ? `주요 거래:\n${highlightLines.join('\n')}` : '주요 거래 데이터를 찾을 수 없습니다.'
          ].join('\n')
        },
        {
          role: 'user',
          content: '위 데이터를 기반으로 짧은 성과 요약과 개선 아이디어를 작성해주세요.'
        }
      ];

      try {
        aiInsights = await createAssistantReply(aiMessages);
      } catch (aiError) {
        console.error('Failed to generate AI insights for performance report', aiError);
        aiInsights = 'AI 인사이트 생성에 실패했습니다. 잠시 후 다시 시도해주세요.';
      }
    } else {
      aiInsights = 'AI 인사이트를 생성하려면 OpenAI API 설정이 필요합니다.';
    }

    const doc = new PDFDocument({ margin: 45 });
    let activeReportFont = 'Helvetica';
    if (REPORT_FONT_AVAILABLE) {
      try {
        doc.registerFont(REPORT_FONT_NAME, REPORT_FONT_PATH);
        activeReportFont = REPORT_FONT_NAME;
      } catch (fontError) {
        console.warn('Failed to register report font', fontError);
      }
    }
    doc.font(activeReportFont);
    const todayStamp = new Date().toISOString().split('T')[0];
    const filename = `trakko-performance-report-${todayStamp}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    const generatedAt = new Intl.DateTimeFormat(resolvedLocale, {
      dateStyle: 'long',
      timeStyle: 'short'
    }).format(new Date());

    const displayName = userRecord.displayName || userRecord.email || sessionUser.displayName || 'Trakko User';
    const periodStartLabel = formatDateForLocale(rangeStartDate, resolvedLocale);
    const periodEndLabel = formatDateForLocale(rangeEndDate, resolvedLocale);
    doc.fillColor(PDF_THEME.heading).fontSize(18).text('Trakko Performance Report');
    doc.fillColor(PDF_THEME.muted).fontSize(10).text(`${periodStartLabel} ~ ${periodEndLabel}`);
    doc.text(`생성 시각: ${generatedAt}`);
    doc.text(`기본 통화: ${normalizedCurrency} · 거래 유형: ${userRecord.traderType ?? 'UNKNOWN'}`);
    drawDivider(doc);

    const makeSignedPercentText = (percent) => {
      if (!Number.isFinite(percent)) return null;
      const base = formatPercentForUser(Math.abs(percent), resolvedLocale);
      const normalized = base.startsWith('-') ? base.slice(1) : base;
      return `${percent >= 0 ? '+' : '-'}${normalized}`;
    };

    const periodReturnPercent = Number.isFinite(periodStartCapitalDisplay) && periodStartCapitalDisplay !== 0
      ? ((periodEndCapitalDisplay - periodStartCapitalDisplay) / Math.abs(periodStartCapitalDisplay)) * 100
      : null;
    const cumulativeReturnPercent = hasInitialSeed && Number.isFinite(initialSeedDisplay) && initialSeedDisplay !== 0
      ? ((periodEndCapitalDisplay - initialSeedDisplay) / Math.abs(initialSeedDisplay)) * 100
      : null;

    const periodReturnNote = makeSignedPercentText(periodReturnPercent);
    const cumulativeReturnNote = makeSignedPercentText(cumulativeReturnPercent);
    const winLossNote = totalTrades > 0 ? `승 ${wins} · 패 ${losses}` : undefined;

    const summaryMetrics = [
      {
        label: '기간 시작 자본',
        value: formatCurrencyForUser(periodStartCapitalDisplay, normalizedCurrency, resolvedLocale)
      },
      {
        label: '기간 종료 자본',
        value: formatCurrencyForUser(periodEndCapitalDisplay, normalizedCurrency, resolvedLocale),
        note: periodReturnNote ? `전 기간 대비 ${periodReturnNote}` : undefined
      },
      {
        label: '기간 손익',
        value: formatCurrencyForUser(periodPnLDisplay, normalizedCurrency, resolvedLocale),
        note: periodReturnNote ? `기간 수익률 ${periodReturnNote}` : undefined
      },
      {
        label: '누적 손익',
        value: formatCurrencyForUser(cumulativePnLDisplay, normalizedCurrency, resolvedLocale),
        note: cumulativeReturnNote ? `초기 시드 대비 ${cumulativeReturnNote}` : undefined
      },
      {
        label: '총 거래 수',
        value: `${totalTrades}건`,
        note: winLossNote
      },
      {
        label: '승률',
        value: winRate !== null ? formatPercentForUser(winRate, resolvedLocale) : '데이터 없음'
      }
    ];

    ensurePageSpace(doc, 140);
    drawSectionHeading(doc, '요약');
    drawMetricsGrid(doc, summaryMetrics);

    if (hasInitialSeed && initialSeedDisplay !== null) {
      doc.fillColor(PDF_THEME.muted).fontSize(9).text(`기본 시드는 ${formatCurrencyForUser(initialSeedDisplay, normalizedCurrency, resolvedLocale)} 로 설정되었습니다.`);
      doc.fillColor(PDF_THEME.body).fontSize(10);
      doc.moveDown(0.15);
    }

    if (latestGoal) {
      ensurePageSpace(doc, 100);
      drawSectionHeading(doc, '목표');
      const goalPeriodLabel = latestGoal.period === 'ANNUAL'
        ? `${latestGoal.targetYear}년 연간 목표`
        : `${latestGoal.targetYear}년 ${latestGoal.targetMonth}월 목표`;
      doc.text(`${goalPeriodLabel} · ${formatCurrencyForUser(latestGoalAmountDisplay ?? 0, normalizedCurrency, resolvedLocale)} (${latestGoal.currency})`);
      doc.moveDown(0.2);
    }

    ensurePageSpace(doc, 120);
    drawSectionHeading(doc, 'AI 인사이트');
    aiInsights
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .forEach((line) => {
        doc.fillColor(PDF_THEME.body).text(line);
        doc.moveDown(0.15);
      });
    doc.moveDown(0.2);

    const groupSectionTitle = (() => {
      switch (granularity) {
        case 'DAILY':
          return '구간별 성과 (일간)';
        case 'WEEKLY':
          return '구간별 성과 (주간)';
        case 'YEARLY':
          return '구간별 성과 (연간)';
        default:
          return '구간별 성과 (월간)';
      }
    })();

    ensurePageSpace(doc, 160);
    drawSectionHeading(doc, groupSectionTitle);
    if (limitedGroupSummariesDisplay.length === 0) {
      doc.fillColor(PDF_THEME.muted).text('선택한 기간에 해당하는 거래 데이터가 없습니다.');
    } else {
      limitedGroupSummariesDisplay.forEach((entry) => {
        const label = formatReportGroupLabel(entry, granularity, resolvedLocale);
        const pnlFormatted = formatCurrencyForUser(entry.displayPnl, normalizedCurrency, resolvedLocale);
        const entryWinPercent = entry.trades > 0
          ? formatPercentForUser((entry.wins / entry.trades) * 100, resolvedLocale)
          : '데이터 없음';
        doc.fillColor(PDF_THEME.body).text(`• ${label} | 손익 ${pnlFormatted} · 거래 ${entry.trades}건 · 승률 ${entryWinPercent}`);
        doc.moveDown(0.2);
      });
      if (groupSummaries.length > limitedGroupSummaries.length) {
        doc.moveDown(0.2);
        doc.fillColor(PDF_THEME.muted).fontSize(9).text('※ 전체 기간이 길어 최근 구간만 요약해 표시했습니다.');
        doc.fontSize(11).fillColor(PDF_THEME.body);
      }
    }
    doc.moveDown(0.3);

    ensurePageSpace(doc, 120);
    drawSectionHeading(doc, '주요 거래');
    if ((!bestTrade || bestTradeDisplayPnL === null) && (!worstTrade || worstTradeDisplayPnL === null)) {
      doc.fillColor(PDF_THEME.muted).text('분석할 거래가 아직 없습니다.');
    } else {
      if (bestTrade && bestTradeDisplayPnL !== null) {
        const bestDate = formatDateForLocale(new Date(bestTrade.tradeDate), resolvedLocale);
        doc.fillColor(PDF_THEME.body).text(`• 최고 거래: ${bestTrade.ticker} (${bestDate}) · 손익 ${formatCurrencyForUser(bestTradeDisplayPnL, normalizedCurrency, resolvedLocale)}`);
        doc.moveDown(0.2);
      }
      if (worstTrade && worstTradeDisplayPnL !== null) {
        const worstDate = formatDateForLocale(new Date(worstTrade.tradeDate), resolvedLocale);
        doc.fillColor(PDF_THEME.body).text(`• 어려웠던 거래: ${worstTrade.ticker} (${worstDate}) · 손익 ${formatCurrencyForUser(worstTradeDisplayPnL, normalizedCurrency, resolvedLocale)}`);
        doc.moveDown(0.2);
      }
    }

    doc.moveDown(0.4);
    doc.fillColor(PDF_THEME.muted).fontSize(9).text('본 리포트는 정보 제공 목적의 AI 분석으로, 최종 투자 판단과 책임은 사용자에게 있습니다.');

    doc.end();
  } catch (error) {
    console.error('Failed to generate performance report', error);
    const errorMessage = error instanceof Error ? error.message : '성과 리포트를 생성하지 못했습니다.';
    if (!res.headersSent) {
      res.status(500).json({ message: errorMessage });
    } else {
      res.end();
    }
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
