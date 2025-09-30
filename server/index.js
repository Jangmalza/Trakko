import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { access, mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const app = express();
const PORT = process.env.PORT ?? 4000;
const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL ?? 'http://localhost:5173';
const SESSION_SECRET = process.env.SESSION_SECRET ?? 'trakko_dev_session_secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL ?? `${process.env.API_BASE_URL ?? `http://localhost:${PORT}`}/api/auth/google/callback`;

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');

const defaultPortfolio = {
  initialSeed: null,
  trades: []
};

const portfolioPathForUser = (userId) => path.join(dataDir, `portfolio-${userId}.json`);

async function ensurePortfolioFileForUser(userId) {
  await mkdir(dataDir, { recursive: true });
  const filePath = portfolioPathForUser(userId);
  try {
    await access(filePath);
  } catch {
    await writeFile(filePath, JSON.stringify(defaultPortfolio, null, 2), 'utf8');
  }
  return filePath;
}

async function readPortfolioForUser(userId) {
  const filePath = await ensurePortfolioFileForUser(userId);
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function writePortfolioForUser(userId, portfolio) {
  const filePath = portfolioPathForUser(userId);
  await mkdir(dataDir, { recursive: true });
  await writeFile(filePath, JSON.stringify(portfolio, null, 2), 'utf8');
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
    const snapshot = await readPortfolioForUser(req.user.id);
    res.json(snapshot);
  } catch (error) {
    console.error('Failed to read portfolio', error);
    res.status(500).json({ message: 'Failed to read portfolio data' });
  }
});

app.post('/api/portfolio/seed', requireAuth, async (req, res) => {
  try {
    const { initialSeed } = req.body ?? {};
    const seedValue = Number(initialSeed);

    if (!Number.isFinite(seedValue) || seedValue <= 0) {
      return res.status(400).json({ message: 'initialSeed must be a positive number' });
    }

    const portfolio = await readPortfolioForUser(req.user.id);
    const next = {
      ...portfolio,
      initialSeed: seedValue
    };

    await writePortfolioForUser(req.user.id, next);
    res.json(next);
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

    const portfolio = await readPortfolioForUser(req.user.id);
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

    await writePortfolioForUser(req.user.id, next);

    res.status(201).json(newTrade);
  } catch (error) {
    console.error('Failed to create trade', error);
    res.status(500).json({ message: 'Failed to create trade' });
  }
});

app.post('/api/portfolio/reset', requireAuth, async (req, res) => {
  try {
    await writePortfolioForUser(req.user.id, defaultPortfolio);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to reset portfolio', error);
    res.status(500).json({ message: 'Failed to reset portfolio' });
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
