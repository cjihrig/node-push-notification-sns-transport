# node-push-notification-sns-transport

[![Current Version](https://img.shields.io/npm/v/node-push-notification-sns-transport.svg)](https://www.npmjs.org/package/node-push-notification-sns-transport)
[![Build Status via Travis CI](https://travis-ci.org/continuationlabs/node-push-notification-sns-transport.svg?branch=master)](https://travis-ci.org/continuationlabs/node-push-notification-sns-transport)
![Dependencies](http://img.shields.io/david/continuationlabs/node-push-notification-sns-transport.svg)
[![belly-button-style](https://img.shields.io/badge/eslint-bellybutton-4B32C3.svg)](https://github.com/continuationlabs/belly-button)


`node-push-notification-sns-transport` provides an interface for sending push notifications via [AWS SNS](https://aws.amazon.com/sns/). This module is meant to be used with [`node-push-notification`](https://github.com/continuationlabs/node-push-notification), but can be used as a standalone module.

## Basic Usage

The following example illustrates how `node-push-notification` integrates with `node-push-notification-sns-transport`.

```javascript
'use strict';
const Push = require('node-push-notification');
const SnsTransport = require('node-push-notification-sns-transport');
const push = new Push();

// Configure push notifications via AWS SNS.
push.addTransport(new SnsTransport({
  aws: {
    accessKeyId: 'AWS_ACCESS_KEY_ID',
    secretAccessKey: 'AWS_SECRET_ACCESS_KEY',
    region: 'us-east-1',
    apiVersions: {
      sns: '2010-03-31'
    }
  },
  platformAppArn: 'AWS_PLATFORM_APPLICATION_ARN'
}));

// Send a push notification via SNS.
push.send('sns', 'DEVICE_TOKEN', { alert: 'how is it going?' }, (err, data) => {
  console.log(err);
  console.log(data);
});
```

## API

`node-push-notification-sns-transport` exports a single class with the following functions:

### `NodePushSnsTransport() constructor`

  - Arguments
    - `options` (object) - An optional configuration object supporting the following schema:
      - `sns` (object) - An optional aws-sdk SNS. If provided, it is used for all AWS API calls. If not provided, a new instance is created.
      - `aws` (object) - An optional configuration object passed to the aws-sdk SNS constructor. This value is ignored if the `sns` option is present.
      - `platformAppArn` (string) - An optional ARN corresponding to the SNS platform application used by this instance. Defaults to `undefined`.
  - Returns
    - Nothing

### `NodePushSnsTransport.prototype.platform`

This property informs `node-push-notification` of the backends supported by this module. This value defaults to `'sns'`.

### `NodePushSnsTransport.prototype.send(platform, device, message, options, callback)`

  - Arguments
    - `platform` (string) - The case insensitive platform name to send the push notification through. This must be `'sns'` or the method will throw.
    - `device` (string) - The destination device ID of the push notification. If the `isEndpoint` option is set, `device` will be treated as a platform application endpoint ARN. This allows the endpoint creation API call to be skipped.
    - `message` (object) - An object containing the message to be sent.
    - `options` (object) - A configuration object that supports the following fields:
      - `isEndpoint` (boolean) - If `true`, the `device` argument is treated as a platform application endpoint ARN. Defaults to `false`.
      - `platformAppArn` (string) - The platform application ARN used when creating the application endpoint. If present, this option overrides any `platformAppArn` passed to the `NodePushSnsTransport` constructor. This option is ignored if `isEndpoint` is `true` because the endpoint creation API call is skipped. Defaults to `undefined`.
    - `callback(err, result)` (function) - A callback function that passes the error and result of the send operation.
  - Returns
    - The `NodePushSnsTransport` instance.
