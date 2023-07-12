const fs = require('fs');

// Change http trace name
{
  const path = './node_modules/@opentelemetry/instrumentation-http/build/src/http.js';

  const oldLines = /\${component\.to(Locale)?UpperCase\(\)} \${method}/
  const oldLinesG = /\${component\.to(Locale)?UpperCase\(\)} \${method}/g
  const newLine = '${method.toUpperCase()} ${pathname}';

  const originalFile = fs.readFileSync(path, { encoding: 'utf8' });

  if (oldLines.test(originalFile)) {
    const modifiedFile = originalFile.replace(oldLinesG, newLine);

    fs.writeFileSync(path, modifiedFile);
  }
}

// Change name on logger
{
  const path = './node_modules/@nestjs/common/services/console-logger.service.js';

  const oldLine = '[Nest]'
  const newLine = '[Api]';

  const originalFile = fs.readFileSync(path, { encoding: 'utf8' });

  if (originalFile.includes(oldLine)) {
    const modifiedFile = originalFile.replace(oldLine, newLine);

    fs.writeFileSync(path, modifiedFile);
  }
}
