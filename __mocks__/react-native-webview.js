// Manual Jest mock for react-native-webview.
// The real module requires a native module (RNCWebViewModule) that isn't present
// under jest-expo's test environment, so tests that render <WebView /> mock it out
// with a plain component that just accepts and exposes the same props.
const React = require('react');

function WebView(props) {
  return React.createElement('WebView', props, props.children);
}

module.exports = { WebView };
