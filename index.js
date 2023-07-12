const { exec } = require('child_process');

const app = exec('~/.nvm/nvm-exec yarn start:prod');

app.stdout.on('data', (data) => {
  process.stdout.write(data);

  if (data.includes('successfully started')) {
    process.send?.('ready');
  }
});

app.stderr.on('data', (data) => {
  process.stderr.write(data);
});
