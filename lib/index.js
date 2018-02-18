'use strict';
const Aws = require('aws-sdk');

class NodePushSnsTransport {
  constructor (options) {
    if (options === null || typeof options !== 'object') {
      options = {};
    }

    if (options.sns) {
      this.sns = options.sns;
    } else {
      this.sns = new Aws.SNS(options.aws);
    }

    this.platformAppArn = options.platformAppArn;
    this.platform = 'sns';
  }

  send (platform, device, message, options, callback) {
    if (platform !== this.platform) {
      throw new Error(`platform ${platform} not supported`);
    }

    if (options.isEndpoint) {
      // The device parameter is actually an existing platform endpoint.
      // No need to make an extra call to create the endpoint again.
      return doSend(this.sns, device, message, callback);
    }

    // Create a platform application endpoint to send the message through.
    const platformAppArn = options.platformAppArn || this.platformAppArn;

    getEndpoint(this.sns, platformAppArn, device, (err, response) => {
      if (err) {
        return callback(err);
      }

      doSend(this.sns, response.EndpointArn, message, callback);
    });

    return this;
  }
}


function doSend (sns, endpoint, message, callback) {
  const payload = JSON.stringify({
    default: message.alert,
    APNS: JSON.stringify({
      aps: message
    })
  });

  sns.publish({
    Message: payload,
    MessageStructure: 'json',
    TargetArn: endpoint
  }, callback);
}


function getEndpoint (sns, platformAppArn, device, callback) {
  sns.createPlatformEndpoint({
    PlatformApplicationArn: platformAppArn,
    Token: device
  }, callback);
}

module.exports = NodePushSnsTransport;
