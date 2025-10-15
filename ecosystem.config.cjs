module.exports = {
  apps: [
    {
      name: 'trakko-dev',
      script: 'server/index.js',
      watch: true,
      ignore_watch: ['dist', 'node_modules', 'uploads'],
      env: {
        NODE_ENV: 'development',
        SERVER_ENV_FILE: 'server/.env.development'
      }
    },
    {
      name: 'trakko-frontend-dev',
      script: 'npm',
      args: 'run dev -- --host --port 5173',
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'trakko-prod',
      script: 'server/index.js',
      watch: false,
      env: {
        NODE_ENV: 'production',
        SERVER_ENV_FILE: 'server/.env.production'
      }
    },
    {
      name: 'trakko-frontend-prod',
      script: 'npm',
      args: 'run preview -- --host --port 4173',
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
