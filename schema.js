module.exports = {
  type: 'object',
  additionalProperties: false,
  properties: {
    iamRoleStatements: { type: 'array' },
    iamManagedPolicies: { type: 'array', items: { type: 'string' } },
    vpc: {
      type: 'object',
      properties: {
        securityGroupIds: {
          type: 'array',
          items: { anyOf: [{ type: 'object' }, { type: 'string' }] },
        },
        subnetIds: {
          type: 'array',
          items: { anyOf: [{ type: 'object' }, { type: 'string' }] },
        },
        assignPublicIp: { type: 'boolean' },
      },
    },
    tags: {
      type: 'object',
      patternProperties: {
        '^.+$': { type: 'string' },
      },
    },
    services: {
      type: 'object',
      patternProperties: {
        '^[a-zA-Z0-9-]+$': {
          type: 'object',
          properties: {
            image: { type: 'string' },
            iamRoleStatements: { type: 'array' },
            vpc: {
              type: 'object',
              properties: {
                securityGroupIds: {
                  type: 'array',
                  items: { anyOf: [{ type: 'object' }, { type: 'string' }] },
                },
                subnetIds: {
                  type: 'array',
                  items: { anyOf: [{ type: 'object' }, { type: 'string' }] },
                },
                assignPublicIp: { type: 'boolean' },
              },
            },
            startCommand: { type: 'string', pattern: '[^\x0a\x0d]+' },
            runtimeSecrets: {
              type: 'array', 
              items: { 
                type: 'object',
                properties: {
                  Name: { type: 'string' },
                  Value: { type: 'string' }
                },
                additionalProperties: false,
                required: ['Name', 'Value']
              } 
            },
            port: { type: 'number', minimum: 0, maximum: 51200 },
            runtimeVariables: {
              type: 'array', 
              items: { 
                type: 'object',
                properties: {
                  Name: { type: 'string' },
                  Value: { type: 'string' }
                },
                additionalProperties: false,
                required: ['Name', 'Value']
              } 
            },
            tags: { type: 'object' },
            dependsOn: { type: 'array', items: { type: 'string' } },
            instanceConfiguration: {
              type: 'object',
              properties: {
                cpu: {
                  type: 'string',
                  enum: ['256', '512', '1024', '2048', '4096', '0.25 vCPU', '0.5 vCPU', '1 vCPU', '2 vCPU', '4 vCPU']
                },
                memory: {
                  type: 'string',
                  enum: ['512', '1024', '2048', '3072', '4096', '6144', '8192', '10240', '12288', '0.5 GB', '1 GB', '2 GB', '3 GB', '4 GB', '6 GB', '8 GB', '10 GB', '12 GB']
                },
                instanceRoleArn: { anyOf: [{ type: 'object' }, { type: 'string' }] }
              }
            },
            healthCheck: {
              type: 'object',
              properties: {
                healthyThreshold: { type: 'number', minimum: 1, maximum: 20 },
                interval: { type: 'number', minimum: 1, maximum: 20 },
                protocol: { type: 'string',},
                path: { type: 'string', enum: ['TCP' | 'HTTP'] },
                timeout: { type: 'number', minimum: 1, maximum: 20 },
                unhealthy: { type: 'number', minimum: 1, maximum: 20 },  
              },
              additionalProperties: false,
            },
            additionalProperties: false,
          },
          additionalProperties: false,
        },
      },
    },
  },
};
