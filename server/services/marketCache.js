import { execFile } from 'child_process';
import path from 'path';

const SCRIPT_PATH = path.resolve('scripts', 'google_finance_scraper.py');
const REFRESH_INTERVAL_MS = 10 * 1000; // 10 seconds

let cache = { quotes: [], fetchedAt: null };
let refreshing = false;

const parseOutput = (stdout) => {
  try {
    const parsed = JSON.parse(stdout);
    if (Array.isArray(parsed)) {
      cache = {
        quotes: parsed,
        fetchedAt: new Date().toISOString()
      };
    } else {
      throw new Error('Parsed output is not an array');
    }
  } catch (error) {
    console.error('Failed to parse market data output', error);
  }
};

export const refreshMarketCache = () => new Promise((resolve) => {
  if (refreshing) {
    resolve(cache);
    return;
  }

  refreshing = true;
  execFile('python3', [SCRIPT_PATH], { timeout: 60 * 1000 }, (error, stdout) => {
    refreshing = false;
    if (error) {
      console.error('Failed to fetch market data via yfinance', error);
      resolve(cache);
      return;
    }
    parseOutput(stdout);
    resolve(cache);
  });
});

export const startMarketCacheScheduler = () => {
  void refreshMarketCache();

  setInterval(() => {
    void refreshMarketCache();
  }, REFRESH_INTERVAL_MS).unref();
};

export const getMarketCache = () => cache;
