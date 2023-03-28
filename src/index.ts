import Serverless from "serverless";
import { get } from "./util";
import { parser } from "./parser";
import { compile } from "./compiler";
import { schema } from "./schema";

interface ServerlessPluginOptions {
  globalOptions?: boolean;
}
class ServerlessPlugin {
  serverless: Serverless;
  options: ServerlessPluginOptions;
  config: any;
  hooks: { "package:compileFunctions": any };
  constructor(serverless: Serverless, options: ServerlessPluginOptions) {
    this.serverless = serverless;
    this.options = options;

    this.serverless.configSchemaHandler.defineTopLevelProperty(
      "appRunner",
      schema
    );

    console.log(
      "serverless.configSchemaHandler ::",
      serverless.configSchemaHandler
    );

    const config = get(serverless, "configurationInput.appRunner", {});

    console.log("config ::", config);

    if (!config.services) {
      return;
    }

    this.config = config;
    this.serverless = serverless;
    this.hooks = {
      "package:compileFunctions": this.compileTasks.bind(this),
    };
  }

  async compileTasks() {
    console.log("Inside Compile ");
    const config = parser({
      ...this.config,
      //   environment: this.getEnvironmentVariables(),
      //   vpc: this.getVpcConfiguration(),
      tags: this.getResourceTags(),
      //   iamRoleStatements: this.getIamRoleStatements(),
      //   iamManagedPolicies: this.getIamManagedPolicies(),
    });
    const images = await this.resolveTaskImages(config.services);
    console.log("Images ::", images);

    const compiled = compile(images, config);

    const template =
      this.serverless.service.provider.compiledCloudFormationTemplate;
    template.Resources = {
      ...template.Resources,
      ...compiled.Resources,
    };
    template.Outputs = {
      ...template.Outputs,
      ...compiled.Outputs,
    };
  }
  // Uses the frameworks internal means of building images, allowing the plugin
  // to use the same ECR image defintion as you would with a Lambda function.
  async resolveTaskImages(tasks) {
    const images = {};

    for (const task of tasks) {
      this.serverless.service.functions[task.name] = {
        image: task.image,
      };

      const { functionImageUri } = await this.serverless
        .getProvider("aws")
        .resolveImageUriAndSha(task.name);

      images[task.name] = functionImageUri;

      delete this.serverless.service.functions[task.name];
    }

    return images;
  }

  getIamRoleStatements() {
    const providerStatements = get(
      this.serverless.service.provider,
      "iam.role.statements",
      []
    );

    return [
      ...providerStatements,
      ...(this.serverless.service.provider.iamRoleStatements || []),
      ...(this.config.iamRoleStatements || []),
    ];
  }

  getIamManagedPolicies() {
    const providerManagedPolicies = get(
      this.serverless.service.provider,
      "iam.role.managedPolicies",
      []
    );

    return [
      ...providerManagedPolicies,
      ...(this.serverless.service.provider.iamManagedPolicies || []),
      ...(this.config.iamManagedPolicies || []),
    ];
  }

  getResourceTags() {
    return {
      ...(this.serverless.service.provider.tags || {}),
      ...(this.config.tags || {}),
    };
  }

  getEnvironmentVariables() {
    return {
      ...(this.serverless.service.provider.environment || {}),
      ...(this.config.environment || {}),
    };
  }

  getVpcConfiguration() {
    return {
      ...(this.serverless.service.provider.vpc || {}),
      ...(this.config.vpc || {}),
    };
  }
}

module.exports = ServerlessPlugin;
