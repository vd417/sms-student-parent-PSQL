const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const previousResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // SignalR ESM uses extensionless imports Metro cannot resolve. The browser
  // bundle is a single file and does not pull Node fetch/ws into the web app.
  if (moduleName === '@microsoft/signalr') {
    return {
      type: 'sourceFile',
      filePath: require.resolve('@microsoft/signalr/dist/browser/signalr.js'),
    };
  }
  if (previousResolve) return previousResolve(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

config.watcher = {
  ...config.watcher,
  healthCheck: { enabled: false },
};

module.exports = config;
