import * as path from 'path';
import * as ecs from '@aws-cdk/aws-ecs';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as cdk from '@aws-cdk/core';
import * as tasks from '../../lib';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'aws-ecs-integ2');

const cluster = new ecs.Cluster(stack, 'FargateCluster');

// Build task definition
const taskDefinition = new ecs.FargateTaskDefinition(stack, 'TaskDef', {
  memoryLimitMiB: 512,
  cpu: 256,
});
const containerDefinition = taskDefinition.addContainer('TheContainer', {
  image: ecs.ContainerImage.fromAsset(path.resolve(__dirname, 'eventhandler-image')),
  memoryLimitMiB: 256,
  logging: new ecs.AwsLogDriver({ streamPrefix: 'EventDemo' }),
});

// Build state machine
const definition = new sfn.Pass(stack, 'Start', {
  result: sfn.Result.fromObject({ SomeKey: 'SomeValue' }),
}).next(
  new sfn.Task(stack, 'FargateTask', {
    task: new tasks.RunEcsFargateTask({
      integrationPattern: sfn.ServiceIntegrationPattern.SYNC,
      cluster,
      taskDefinition,
      assignPublicIp: true,
      containerOverrides: [
        {
          containerDefinition,
          environment: [
            {
              name: 'SOME_KEY',
              value: sfn.JsonPath.stringAt('$.SomeKey'),
            },
          ],
        },
      ],
    }),
  }),
);

new sfn.StateMachine(stack, 'StateMachine', {
  definition,
});

app.synth();
