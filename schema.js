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
            name: { type: 'string' },
            image: { type: 'string' },
            iamRoleStatements: { type: 'array' },
            executionRoleArn: {
              anyOf: [{ type: 'object' }, { type: 'string' }],
            },
            taskRoleArn: { anyOf: [{ type: 'object' }, { type: 'string' }] },
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
                  enum: ['1024', '2048', '1 vCPU', '2 vCPU']
                },
                memory: {
                  type: 'string',
                  enum: ['2048', '3072', '4096', '2 GB', '3 GB', '4 GB']
                },
                instanceRoleArn: { anyOf: [{ type: 'object' }, { type: 'string' }] }
              }
            },
          },
          additionalProperties: false,
        },
      },
    },
  },
};
