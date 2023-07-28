/**
 * This script is meant to be used by the PM2
 */

const { exec } = require('child_process');

const app = exec('rtx exec pnpm start:prod');

app.stdout.on('data', (data) => {
  process.stdout.write(data);

  if (data.includes('successfully started')) {
    process.send?.('ready');
  }
});

app.stderr.on('data', (data) => {
  process.stderr.write(data);
});
