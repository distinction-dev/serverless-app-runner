'use strict';

const { get } = require('./util');

const parseTask = (global, name, task) => {
  const definition = {
    name: task.name || name,
    dependsOn: task.dependsOn,
    image: task.image,
    executionRoleArn: task.executionRoleArn || global.executionRoleArn,
    taskRoleArn: task.taskRoleArn || global.taskRoleArn,
    vpc: {
      subnetIds: get(task, 'vpc.subnetIds', global.vpc.subnetIds),
      securityGroupIds: get(
        task,
        'vpc.securityGroupIds',
        global.vpc.securityGroupIds
      ),
      assignPublicIp: get(
        task,
        'vpc.assignPublicIp',
        global.vpc.assignPublicIp
      ),
    },
    command: task.command || [],
    entryPoint: task.entryPoint || [],
    memory: task.instanceConfiguration?.memory || global.memory,
    cpu: task.instanceConfiguration?.cpu || global.cpu,
    architecture: task.architecture || global.architecture,
    environment: {
      ...global.environment,
      ...(task.environment || {}),
    },
    runtimeVariables: task.runtimeVariables || [],
    runtimeSecrets: task.runtimeSecrets || [],
    tags: { ...global.tags, ...(task.tags || {}) },
    cloudFormationResource: {
      task: {
        ...global.cloudFormationResource.task,
        ...get(task, 'cloudFormationResource.task', {}),
      },
      container: {
        ...global.cloudFormationResource.container,
        ...get(task, 'cloudFormationResource.container', {}),
      },
      service: {
        ...global.cloudFormationResource.service,
        ...get(task, 'cloudFormationResource.service', {}),
      },
    },
    iamRoleStatements: task.iamRoleStatements || []
  };

  if (task.schedule) {
    return {
      ...definition,
      schedule: task.schedule,
    };
  }

  const isStrictMode = get(task, 'service.strict', false);

  return {
    ...definition,
    service: {
      desiredCount: get(task, 'service.desiredCount', 1),
      maximumPercent: get(
        task,
        'service.maximumPercent',
        isStrictMode ? 100 : 200
      ),
      minimumHealthyPercent: get(
        task,
        'service.minimumHealthyPercent',
        isStrictMode ? 0 : 100
      ),
      spot: get(task, 'service.spot', false),
    },
  };
};

module.exports = config => {
  const global = {
    clusterName: config.clusterName,
    containerInsights: config.containerInsights,
    memory: config.memory || '2 GB',
    cpu: config.cpu || '1 vCPU',
    architecture: config.architecture,
    environment: config.environment || {},
    executionRoleArn: config.executionRoleArn,
    taskRoleArn: config.taskRoleArn,
    iamRoleStatements: config.iamRoleStatements || [],
    iamManagedPolicies: config.iamManagedPolicies || [],
    logGroupName: config.logGroupName,
    logRetentionInDays: config.logRetentionInDays,
    vpc: {
      subnetIds: get(config, 'vpc.subnetIds', []),
      securityGroupIds: get(config, 'vpc.securityGroupIds', []),
      assignPublicIp: get(config, 'vpc.assignPublicIp', false),
    },
    services: config.services || {},
    cloudFormationResource: {
      task: get(config, 'cloudFormationResource.task', {}),
      container: get(config, 'cloudFormationResource.container', {}),
      service: get(config, 'cloudFormationResource.service', {}),
    },
  };

  return {
    ...global,
    services: Object.entries(config.services).map(([name, service]) =>
      parseTask(global, name, service)
    ),
  };
};