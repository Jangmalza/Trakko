const path = require('path');

const DEV_APP_PATH = __dirname;
const PROD_APP_PATH = path.resolve(__dirname, '../Trakko-prod');

module.exports = {
  apps: [
    {
      name: 'trakko-dev',
      script: 'server/index.js',
      watch: true,
      ignore_watch: ['dist', 'node_modules', 'uploads'],
      cwd: DEV_APP_PATH,
      env: {
        NODE_ENV: 'development',
        SERVER_ENV_FILE: 'server/.env.development'
      }
    },
    {
      name: 'trakko-frontend-dev',
      script: 'npm',
      args: 'run dev -- --host --port 5173',
      cwd: DEV_APP_PATH,
      watch: false,
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'trakko-prod',
      script: 'server/index.js',
      watch: false,
      cwd: PROD_APP_PATH,
      env: {
        NODE_ENV: 'production',
        SERVER_ENV_FILE: 'server/.env.production'
      }
    },
    {
      name: 'trakko-frontend-prod',
      script: 'npm',
      args: 'run preview -- --host --port 4173',
      cwd: PROD_APP_PATH,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
