# 🚀 Serverless App Runner

Adds the ability to maintain long-running apprunner instance within your Serverless project.

## Overview

If you want to have long running instance (like Cloud Run GCP) in AWS environment then you can take advantage of [AWS App Runner](https://docs.aws.amazon.com/apprunner/latest/dg/what-is-apprunner.html).  

App Runner is an AWS service that provides a fast, simple, and cost-effective way to deploy from source code or a container image directly to a scalable and secure web application in the AWS Cloud.

This plugin adds the ability to declare App runner instances configuration using serverless framework and deployment as Infrastructure as code.

At a high-level the plugin provides the following functionality:

- Allows you to declare container image based App runner instances.
- Uses the ECR image support provided within Serverless Framework to help build container image based instances.
- Maintains an IAM role which honours all managed policies and statements that have been declared within the provider configuration.
- Provides _escape-hatches_ to supply custom configuration such as role ARNs/tags etc.
- Provides you way to auto scale service instances.

## Example

Below is an example configuration which highlights all possible available options.

```yaml
provider:
  # (required) similar to Lambda-containers, images defined within the provider are available to services.
  ecr:
    images:
      my-service:
        path: ./
        file: Dockerfile

  # (optional) role statements present within the provider are added to the task role.
  iamRoleStatements:
    - Effect: Allow
      Action: 'sqs:*'
      Resource: '*'

  # (optional) managed polices present within the provider are added to the task role.
  iamManagedPolicies:
    - arn:aws:iam::123456:policy/my-managed-provider-policy

  # (optional) environment variables present within the provider are added to all tasks.
  environment:
    name: value

  # (optional) tags present within the provider are added to service resources.
  tags:
    name: value

appRunner:
  services:
    # (required) this name will be used to construct service name. Environment will be added as suffix. ex. service1-dev
    service1: 

      # (required) required for now because code version of appruner is not supported in plugin yet
      image: my-service

      # (optional) Environment variables that are available to your running App Runner service. An array of key-value pairs.
      runtimeVariables: 
        - Name: stage
          Value: dev
        - Name: key
          Value: abc
       
      # (optional) An array of key-value pairs representing the secrets and parameters that get referenced to your service as an environment variable.
      # Read more info here [guide](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-apprunner-service-imageconfiguration.html#cfn-apprunner-service-imageconfiguration-runtimeenvironmentvariables)
      runtimeSecrets: 
       - Name: ssm
         Value: /slsTs/stage
       
      # (optional) additional role statements you wish to add to the instance role, you would place statements here instead of at 
      # the provider level if you only wished them to target this service only.
      iamRoleStatements: 
       - Effect: Allow
         Action: 
          - 'ssm:Describe*'
          - 'ssm:Get*'
          - 'ssm:List*'
         Resource: '*'
        
      # (optional) The port that your application listens to in the container. 
      # Default 8080, Minimum: 0, Maximum: 51200
      port: 8080

      # (optional) command that App Runner runs to start the application in the source image.
      # If specified, this command overrides the Docker image’s default start command.
      startCommand: node index.js

      # (optional) Describes the runtime configuration of an AWS App Runner service instance (scaling unit)
      instanceConfiguration:

        # (optional) The number of CPU units reserved for each instance of your App Runner service.
        # Default: 1 vCPU, Value: 256|512|1024|2048|4096|(0.25|0.5|1|2|4) vCPU
        cpu: 1 vCPU

        # (optional) The amount of memory, in MB or GB, reserved for each instance of your App Runner service.
        # Default: 2 GB, Value: 512|1024|2048|3072|4096|6144|8192|10240|12288|(0.5|1|2|3|4|6|8|10|12) GB
        memory: 2 GB

        # (optional) The ARN of an IAM role that provides permissions to your App Runner service.
        instanceRoleArn: arn:aws:iam::12345678901:role/my-instance-role

      # (optional) tags mentioned here will be added at service level
      tags: 
        name: value

      # (optional) Logical resource name within serverless file which will be prerequisuite for this service
      dependsOn: myQueuePolicy

      # (optional) Describes the settings for the health check that AWS App Runner performs to monitor the health of a service.
      healthCheck: 
        
        # (optional) The number of consecutive checks that must succeed before App Runner decides that the service is healthy.
        # default 1, min 1,  max 20
        healthyThreshold: 1

        # (optional) The time interval, in seconds, between health checks.
        # default 1, min 1,  max 20
        interval: 5

        # (optional) The URL that health check requests are sent to.
        # default "/"
        path: "/"

        # (optional) The IP protocol that App Runner uses to perform health checks for your service.
        # If you set Protocol to 'HTTP', App Runner sends health check requests to the HTTP path specified by 'Path'.
        # default TCP, values: TCP|HTTP
        protocol: "HTTP"

        # (optional) The time, in seconds, to wait for a health check response before deciding it failed.
        # default 2, min 1,  max 20
        timeout: 2

        # (optional) The number of consecutive checks that must fail before App Runner decides that the service is unhealthy.
        # default 5, min 1,  max 20
        unhealthy: 5

        # (optional) If true, continuous integration from the source repository is enabled for the App Runner service.
        # Each repository change (including any source code commit or new image version) starts a deployment.
        # default: true, values: true|false
      autoDeploy: true
```

## Road Map

In upcoming day we will be adding configuration for source code repository. Plus more functionalities will be added to make it more similar to cloudformation.
