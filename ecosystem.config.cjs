module.exports = {
  apps: [{
    name: 'chevy-simulator',
    script: 'npm',
    args: 'run dev',
    watch: false,
    env: {
      NODE_ENV: 'development',
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};