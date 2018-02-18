'use strict';
const Aws = require('aws-sdk');
const Barrier = require('cb-barrier');
const Code = require('code');
const Lab = require('lab');
const Mock = require('aws-sdk-mock');
const Push = require('node-push-notification');
const NodePushSnsTransport = require('../lib');

// Test shortcuts
const lab = exports.lab = Lab.script();
const { describe, it } = lab;
const { expect } = Code;


describe('NodePushSnsTransport', () => {
  describe('constructor', () => {
    it('supports passing in an SNS instance', () => {
      const sns = new Aws.SNS();
      const transport = new NodePushSnsTransport({ sns });

      expect(transport.sns).to.shallow.equal(sns);
      expect(transport.platformAppArn).to.equal(undefined);
      expect(transport.platform).to.equal('sns');
    });

    it('supports passing in AWS options', () => {
      const aws = { apiVersions: { sns: '2010-03-31' } };
      const transport = new NodePushSnsTransport({ aws });

      expect(transport.sns.config.apiVersions).to.equal(aws.apiVersions);
      expect(transport.platformAppArn).to.equal(undefined);
      expect(transport.platform).to.equal('sns');
    });

    it('supports using AWS default options', () => {
      const transport = new NodePushSnsTransport(null);

      expect(transport.sns.config.apiVersions).to.equal({});
      expect(transport.platformAppArn).to.equal(undefined);
      expect(transport.platform).to.equal('sns');
    });

    it('supports passing in a platform application ARN', () => {
      const transport = new NodePushSnsTransport({ platformAppArn: 'foo' });

      expect(transport.platformAppArn).to.equal('foo');
      expect(transport.platform).to.equal('sns');
    });
  });

  describe('send()', () => {
    it('accepts an application platform endpoint as the device', () => {
      const barrier = new Barrier();
      const arn = 'arn:aws:sns:us-east-1:999999999999:endpoint/APNS_SANDBOX/PushApp/99999999-9999-9999-9999-999999999999';

      Mock.mock('SNS', 'createPlatformEndpoint', function (options, callback) {
        callback(new Error('createPlatformEndpoint() should not be called'));
      });

      Mock.mock('SNS', 'publish', function (options, callback) {
        expect(options.TargetArn).to.equal(arn);
        callback(null, {
          MessageId: 'message-id-mock',
          ResponseMetadata: { RequestId: 'request-id-mock' }
        });
      });

      const transport = new NodePushSnsTransport();

      transport.send('sns', arn, { alert: 'hello' }, { isEndpoint: true }, (err, response) => {
        Mock.restore('SNS', 'createPlatformEndpoint');
        Mock.restore('SNS', 'publish');
        expect(err).to.not.exist();
        expect(response.MessageId).to.equal('message-id-mock');
        expect(response.ResponseMetadata.RequestId).to.equal('request-id-mock');
        barrier.pass();
      });

      return barrier;
    });

    it('the platformAppArn option overrides the platformAppArn passed to the constructor', () => {
      const barrier = new Barrier();

      Mock.mock('SNS', 'createPlatformEndpoint', function (options, callback) {
        expect(options.PlatformApplicationArn).to.equal('bar');
        callback(null, { EndpointArn: 'endpoint-arn-mock' });
      });

      Mock.mock('SNS', 'publish', function (options, callback) {
        expect(options.TargetArn).to.equal('endpoint-arn-mock');
        callback(null, {
          MessageId: 'message-id-mock',
          ResponseMetadata: { RequestId: 'request-id-mock' }
        });
      });

      const transport = new NodePushSnsTransport({ platformAppArn: 'foo' });

      transport.send('sns', 'device', { alert: 'hello' }, { platformAppArn: 'bar' }, (err, response) => {
        Mock.restore('SNS', 'createPlatformEndpoint');
        Mock.restore('SNS', 'publish');
        expect(err).to.not.exist();
        expect(response.MessageId).to.equal('message-id-mock');
        expect(response.ResponseMetadata.RequestId).to.equal('request-id-mock');
        barrier.pass();
      });

      return barrier;
    });

    it('handles errors while creating the endpoint', () => {
      const barrier = new Barrier();

      Mock.mock('SNS', 'createPlatformEndpoint', function (options, callback) {
        callback(new Error('could not create platform endpoint'));
      });

      Mock.mock('SNS', 'publish', function (options, callback) {
        callback(new Error('publish should not be called'));
      });

      const transport = new NodePushSnsTransport({ platformAppArn: 'foo' });

      transport.send('sns', 'device', { alert: 'hello' }, {}, (err, response) => {
        Mock.restore('SNS', 'createPlatformEndpoint');
        Mock.restore('SNS', 'publish');
        expect(err).to.be.an.error(Error, 'could not create platform endpoint');
        expect(response).to.not.exist();
        barrier.pass();
      });

      return barrier;
    });

    it('throws if the platform is not supported', () => {
      const transport = new NodePushSnsTransport();

      expect(() => {
        transport.send('foo');
      }).to.throw(Error, 'platform foo not supported');
    });
  });

  it('works with node-push-notification', () => {
    const barrier = new Barrier();
    const push = new Push();
    const device = 'baz';

    Mock.mock('SNS', 'createPlatformEndpoint', function (options, callback) {
      callback(null, { EndpointArn: 'endpoint-arn-mock' });
    });

    Mock.mock('SNS', 'publish', function (options, callback) {
      expect(options.TargetArn).to.equal('endpoint-arn-mock');
      callback(null, {
        MessageId: 'message-id-mock',
        ResponseMetadata: { RequestId: 'request-id-mock' }
      });
    });

    push.addTransport(new NodePushSnsTransport({
      aws: {
        accessKeyId: 'foo',
        secretAccessKey: 'bar',
        region: 'us-east-1',
        apiVersions: { sns: '2010-03-31' }
      },
      platformAppArn: 'arn:aws:sns:us-east-1:999999999999:app/APNS_SANDBOX/PushApp'
    }));

    push.send('sns', device, { alert: 'hello' }, (err, response) => {
      Mock.restore('SNS', 'createPlatformEndpoint');
      Mock.restore('SNS', 'publish');
      expect(err).to.not.exist();
      expect(response.MessageId).to.equal('message-id-mock');
      expect(response.ResponseMetadata.RequestId).to.equal('request-id-mock');
      barrier.pass();
    });

    return barrier;
  });
});
