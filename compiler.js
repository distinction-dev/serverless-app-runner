'use strict';

const toIdentifier = name => {
  const id = name.replace(/[^0-9A-Za-z]/g, '');
  return id.charAt(0).toUpperCase() + id.slice(1);
};

const toTags = (tags = {}) => {
  return Object.entries(tags).map(([Key, Value]) => ({ Key, Value }));
}

const toEnvironment = tags =>
  Object.entries(tags).map(([Name, Value]) => ({ Name, Value }));

const compileCluster = (config, images, service, serverless) => ({
  Resources: {
    [service.name + 'AppRunnerService']: {
      Type: 'AWS::AppRunner::Service',
      Properties: {
        ServiceName: service.name + '-' + serverless.configurationInput.provider.stage,
        SourceConfiguration: {
          AuthenticationConfiguration: {
            AccessRoleArn: service.accessRoleArn || {
              'Fn::GetAtt': ['AppRunnerECRAccessRole', 'Arn'],
            }
          },
          AutoDeploymentsEnabled: service.autoDeploy ?? true,
          ImageRepository: {
            ImageIdentifier: images[service.name],
            ImageRepositoryType: 'ECR',
            ...( (service.port || service.runtimeSecrets || service.runtimeVariables || service.startCommand)&& {
              ImageConfiguration: {
                Port: service.port ?? 8080,
                ...(service.runtimeSecrets.length > 0 && {
                  RuntimeEnvironmentSecrets : service.runtimeSecrets
                }), 
                ...(service.runtimeVariables.length > 0 && {
                  RuntimeEnvironmentVariables : service.runtimeVariables
                }),
                ...(service.startCommand && { StartCommand: service.startCommand } )
              }
            })
          }
        },
        InstanceConfiguration: {
          Cpu: service.cpu || '1 vCPU',
          Memory: service.memory || '2 GB',
          InstanceRoleArn: service.instanceConfiguration?.instanceRoleArn || {
            'Fn::GetAtt': [service.name + 'AppRunnerInstanceRole' + serverless.configurationInput.provider.stage, 'Arn'],
          }
        },
        HealthCheckConfiguration: {
          HealthyThreshold: service.healthCheck?.healthyThreshold ?? 1,
          Interval: service.healthCheck?.interval ?? 5,
          ...( service.healthCheck?.protocol === 'HTTP' && {Path: service.healthCheck?.path ?? '/' }),
          Protocol: service.healthCheck?.protocol ?? 'TCP',
          Timeout: service.healthCheck?.timeout ?? 2,
          UnhealthyThreshold: service.healthCheck?.unhealthy ?? 5
        },
        Tags: toTags({ ...(config.tags || {}), ...(service.tags || {}) }),
      },
    },
  },
  Outputs: {
    [service.name + 'AppRunnerServiceUrl']: {
      Value: {
        'Fn::GetAtt': [service.name + 'AppRunnerService', 'ServiceUrl'],
      },
      Export: {
        Name: {
          'Fn::Join': [
            '-',
            [
              {
                Ref: 'AWS::StackName',
              },
              service.name + 'AppRunnerServiceUrl',
            ],
          ],
        },
      },
    },
  },
});

const ECRAccessRole = (config) => ({
  Resources: {
    AppRunnerECRAccessRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              'Principal': {
                  Service: 'build.apprunner.amazonaws.com'
              },
              Action: 'sts:AssumeRole'
            },
          ],
        },
        Policies: [
          {
            PolicyName: 'AWSAppRunnerServicePolicyForECRAccess',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: [
                    'ecr:GetDownloadUrlForLayer',
                    'ecr:BatchGetImage',
                    'ecr:DescribeImages',
                    'ecr:GetAuthorizationToken',
                    'ecr:BatchCheckLayerAvailability',
                  ],
                  Resource: '*'
                }
              ],
            },
          },
        ],
        Tags: toTags(config.tags),
      },
    },
  }
});

const compileIamRoles = (config, service, serverless) => ({
  Resources: {
    [service.name + 'AppRunnerInstanceRole' + serverless.configurationInput.provider.stage]: {
      Type: 'AWS::IAM::Role',
      Properties: {
        RoleName: service.name + 'Apprunner-instance-role' + serverless.configurationInput.provider.stage, 
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: ['tasks.apprunner.amazonaws.com'],
              },
              Action: ['sts:AssumeRole'],
            },
          ],
        },
        Policies:
          service.iamRoleStatements.length > 0
            ? [
                {
                  PolicyName: 'ApprunnerTaskPolicy',
                  PolicyDocument: {
                    Version: '2012-10-17',
                    Statement: service.iamRoleStatements,
                  },
                },
              ]
            : [],
        ManagedPolicyArns: service.iamManagedPolicies,
        Tags: toTags(config.tags),
      },
    },
  },
  Outputs: {},
});

module.exports = (images, config, serverless) => {
  const ecrRole = ECRAccessRole(config);
  const iamRoles = config.services.reduce(({ Resources, Outputs }, service) => {
    const role = compileIamRoles(config, service, serverless);
    return {
      Resources: { ...Resources, ...role.Resources },
      Outputs: { ...Outputs, ...role.Outputs },
    };
  }, {})
  const services = config.services.reduce(({ Resources, Outputs }, service) => {
    const compiled = compileCluster(config, images, service, serverless);
    return {
      Resources: { ...Resources, ...compiled.Resources },
      Outputs: { ...Outputs, ...compiled.Outputs },
    };
  }, {});

  return {
    Resources: {
      ...services.Resources,
      ...iamRoles.Resources,
      ...ecrRole.Resources
    },
    Outputs: {
      ...services.Outputs,
      ...iamRoles.Outputs,
      ...ecrRole.Outputs
    },
  };
};