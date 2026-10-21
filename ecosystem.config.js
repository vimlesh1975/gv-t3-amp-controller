// PM2 Process File for Grass Valley T3 iDDR Controller
// Run with: npx pm2 start ecosystem.config.js
// Or: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 't3-controller',
      script: './server.js',
      cwd: __dirname,
      instances: 1, // Single instance required to preserve stateful TCP sockets to T3 hardware
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 23000,
      },
    },
  ],
};
