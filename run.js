const AnyProxy = require('anyproxy');
const env = require('./env.js');
const options = {
  port: env.port,
  rule: require('./rule'),
  webInterface: {
    enable: true,
    webPort: env.web_port
  },
  throttle: 10000,
  forceProxyHttps: true,
  wsIntercept: false, // 不开启websocket代理
  silent: false
};
const proxyServer = new AnyProxy.ProxyServer(options);
proxyServer.start();