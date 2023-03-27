import Serverless from "serverless";

interface ServerlessPluginOptions {
  globalOptions?: boolean;
}
class ServerlessPlugin {
  serverless: Serverless;
  options: ServerlessPluginOptions;
  constructor(serverless: Serverless, options: ServerlessPluginOptions) {
    this.serverless = serverless;
    this.options = options;
  }
}

module.exports = ServerlessPlugin;
