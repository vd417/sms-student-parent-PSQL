const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const previousResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // SignalR's ESM uses extensionless imports (./Loggers) that Metro cannot
  // resolve, which blanks the entire web app including login.
  if (moduleName === '@microsoft/signalr') {
    return {
      type: 'sourceFile',
      filePath: require.resolve('@microsoft/signalr/dist/cjs/index.js'),
    };
  }
  if (previousResolve) return previousResolve(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
