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

const compileCluster = (config, images, service) => ({
  Resources: {
    [service.name + 'AppRunnerService']: {
      Type: 'AWS::AppRunner::Service',
      Properties: {
        ServiceName: service.name,
        SourceConfiguration: {
          AuthenticationConfiguration: {
            AccessRoleArn: service.accessRoleArn || {
              'Fn::GetAtt': ['AppRunnerECRAccessRole', 'Arn'],
            }
          },
          AutoDeploymentsEnabled: service.autoDeploy ?? true,
          ImageRepository: {
            ImageIdentifier: images[service.name],
            ImageRepositoryType: 'ECR'
          }
        },
        InstanceConfiguration: {
          Cpu: service.instanceConfiguration?.cpu || '1 vCPU',
          Memory: service.instanceConfiguration?.memory || '2 GB',
          InstanceRoleArn: service.instanceConfiguration?.instanceRoleArn || {
            'Fn::GetAtt': [service.name + 'AppRunnerInstanceRole', 'Arn'],
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
  Outputs: {},
});

const ECRAccessRole = () => ({
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
                        'ecr:BatchCheckLayerAvailability'
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

const compileIamRoles = (config, service) => ({
  Resources: {
    [service.name + 'AppRunnerInstanceRole']: {
      Type: 'AWS::IAM::Role',
      Properties: {
        RoleName: service.name + 'Apprunner-instance-role', 
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
          config.iamRoleStatements.length > 0
            ? [
                {
                  PolicyName: 'ApprunnerTaskPolicy',
                  PolicyDocument: {
                    Version: '2012-10-17',
                    Statement: config.iamRoleStatements,
                  },
                },
              ]
            : [],
        ManagedPolicyArns: config.iamManagedPolicies,
        Tags: toTags(config.tags),
      },
    },
  },
  Outputs: {},
});

// const compileTaskDefinition = (images, task) => ({
//   Type: 'AWS::ECS::TaskDefinition',
//   DependsOn: task.dependsOn,
//   Properties: {
//     ContainerDefinitions: [
//       {
//         Name: task.name,
//         Image: images[task.name],
//         Environment: toEnvironment(task.environment),
//         EntryPoint: task.entryPoint,
//         Command: task.command,
//         LogConfiguration: {
//           LogDriver: 'awslogs',
//           Options: {
//             'awslogs-region': { 'Fn::Sub': '${AWS::Region}' },
//             'awslogs-group': {
//               'Fn::Sub': '${FargateTasksLogGroup}',
//             },
//             'awslogs-stream-prefix': 'fargate',
//           },
//         },
//         ...task.cloudFormationResource.container,
//       },
//     ],
//     Family: task.name,
//     NetworkMode: 'awsvpc',
//     ExecutionRoleArn: task.executionRoleArn || {
//       'Fn::Sub': '${FargateIamExecutionRole}',
//     },
//     TaskRoleArn: task.taskRoleArn || {
//       'Fn::Sub': '${FargateIamTaskRole}',
//     },
//     RequiresCompatibilities: ['FARGATE'],
//     Memory: task.memory,
//     Cpu: task.cpu,
//     RuntimePlatform: task.architecture && {
//       CpuArchitecture: task.architecture,
//     },
//     Tags: toTags(task.tags),
//     ...task.cloudFormationResource.task,
//   },
// });

const compileScheduledTask = (identifier, task) => ({
  Type: 'AWS::Events::Rule',
  DependsOn: task.dependsOn,
  Properties: {
    ScheduleExpression: task.schedule,
    Targets: [
      {
        Id: identifier,
        Arn: {
          'Fn::GetAtt': ['FargateTasksCluster', 'Arn'],
        },
        RoleArn: {
          'Fn::GetAtt': ['FargateIamExecutionRole', 'Arn'],
        },
        EcsParameters: {
          TaskDefinitionArn: {
            'Fn::Sub': '${' + identifier + 'Task}',
          },
          TaskCount: 1,
          LaunchType: 'FARGATE',
          NetworkConfiguration: {
            AwsVpcConfiguration: {
              AssignPublicIp: task.vpc.assignPublicIp ? 'ENABLED' : 'DISABLED',
              SecurityGroups: task.vpc.securityGroupIds,
              Subnets: task.vpc.subnetIds,
            },
          },
        },
      },
    ],
  },
});

// const compileService = (identifier, task) => ({
//   Type: 'AWS::ECS::Service',
//   DependsOn: task.dependsOn,
//   Properties: {
//     Cluster: { 'Fn::Sub': '${FargateTasksCluster}' },
//     ServiceName: task.name,
//     CapacityProviderStrategy: [
//       {
//         CapacityProvider: task.service.spot ? 'FARGATE_SPOT' : 'FARGATE',
//         Weight: 1,
//       },
//     ],
//     DesiredCount: task.service.desiredCount,
//     DeploymentConfiguration: {
//       MaximumPercent: task.service.maximumPercent,
//       MinimumHealthyPercent: task.service.minimumHealthyPercent,
//     },
//     TaskDefinition: { 'Fn::Sub': '${' + identifier + 'Task}' },
//     NetworkConfiguration: {
//       AwsvpcConfiguration: {
//         AssignPublicIp: task.vpc.assignPublicIp ? 'ENABLED' : 'DISABLED',
//         SecurityGroups: task.vpc.securityGroupIds,
//         Subnets: task.vpc.subnetIds,
//       },
//     },
//     PropagateTags: 'TASK_DEFINITION',
//     Tags: toTags(task.tags),
//     ...task.cloudFormationResource.service,
//   },
// });

// const compileTask = (images, task) => {
//   const identifier = toIdentifier(task.name);

//   if (task.schedule) {
//     return {
//       Resources: {
//         [identifier + 'Task']: compileTaskDefinition(images, task),
//         [identifier + 'ScheduledTask']: compileScheduledTask(identifier, task),
//       },
//       Outputs: {
//         [identifier + 'TaskArn']: {
//           Value: { Ref: identifier + 'Task' },
//         },
//         [identifier + 'ScheduledTaskArn']: {
//           Value: {
//             'Fn::GetAtt': [identifier + 'ScheduledTask', 'Arn'],
//           },
//         },
//       },
//     };
//   }

//   return {
//     Resources: {
//       [identifier + 'Task']: compileTaskDefinition(images, task),
//       [identifier + 'Service']: compileService(identifier, task),
//     },
//     Outputs: {
//       [identifier + 'TaskArn']: {
//         Value: { Ref: identifier + 'Task' },
//       },
//       [identifier + 'ServiceArn']: {
//         Value: { Ref: identifier + 'Service' },
//       },
//     },
//   };
// };

module.exports = (images, config) => {
  const ecrRole = ECRAccessRole();
  const iamRoles = config.services.reduce(({ Resources, Outputs }, service) => {
    const role = compileIamRoles(config, service);
    return {
      Resources: { ...Resources, ...role.Resources },
      Outputs: { ...Outputs, ...role.Outputs },
    };
  })
  const services = config.services.reduce(({ Resources, Outputs }, service) => {
    const compiled = compileCluster(config, images, service);
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