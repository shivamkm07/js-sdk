/*
Copyright 2022 The Dapr Authors
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import * as grpc from "@grpc/grpc-js";
import { CommunicationProtocolEnum, DaprClient, LogLevel } from "../../../src";
import { SubscribeConfigurationResponse } from "../../../src/types/configuration/SubscribeConfigurationResponse";
import * as DockerUtils from "../../utils/DockerUtil";
import { DaprClient as DaprClientGrpc } from "../../../src/proto/dapr/proto/runtime/v1/dapr_grpc_pb";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";
import { InterceptingListener } from "@grpc/grpc-js/build/src/call-stream";
import { NextCall } from "@grpc/grpc-js/build/src/client-interceptors";

const daprHost = "localhost";
const daprPort = "50000"; // Dapr Sidecar Port of this Example Server

describe("grpc/client", () => {
  let client: DaprClient;

  // We need to start listening on some endpoints already
  // this because Dapr is not dynamic and registers endpoints on boot
  beforeAll(async () => {
    client = new DaprClient({
      daprHost,
      daprPort,
      communicationProtocol: CommunicationProtocolEnum.GRPC,
      logger: {
        level: LogLevel.Debug,
      },
    });
  }, 10 * 1000);

  afterAll(async () => {
    await client.stop();
  });

  describe("client", () => {
    it("should return isInitialized is true if the sidecar has been started", async () => {
      // Awaiting this will ensure the client is started
      await client.daprClient.getClient();

      const isInitialized = await client.getIsInitialized();
      expect(isInitialized).toBe(true);
    });
  });

  describe("Proxy", () => {
    it("should allow to use a proxy builder to proxy a gRPC request", async () => {
      let mockMetadataRes: grpc.Metadata = new grpc.Metadata();
      const mockInterceptor = jest.fn((options: grpc.InterceptorOptions, nextCall: NextCall): grpc.InterceptingCall => {
        return new grpc.InterceptingCall(nextCall(options), {
          start: function (
            metadata: grpc.Metadata,
            listener: InterceptingListener,
            next: (metadata: grpc.Metadata, listener: InterceptingListener | grpc.Listener) => void,
          ) {
            mockMetadataRes = metadata;
            next(metadata, listener);
          },
        });
      });

      const clientProxy = await client.proxy.create<DaprClientGrpc>(DaprClientGrpc, {
        interceptors: [mockInterceptor],
      });

      await new Promise((resolve) => clientProxy.getMetadata(new Empty(), resolve));

      expect(mockInterceptor.mock.calls.length).toBe(1);
      expect(mockMetadataRes.get("dapr-app-id")[0]).toBe("test-suite");
    });

    it("should allow to use a proxy builder that uses daprAppId by setting custom env variable to proxy a gRPC request", async () => {
      const oldProcessAppId = process.env?.APP_ID;
      process.env.APP_ID = "test-suite-proxy";

      let mockMetadataRes: grpc.Metadata = new grpc.Metadata();
      const mockInterceptor = jest.fn((options: grpc.InterceptorOptions, nextCall: NextCall): grpc.InterceptingCall => {
        return new grpc.InterceptingCall(nextCall(options), {
          start: function (
            metadata: grpc.Metadata,
            listener: InterceptingListener,
            next: (metadata: grpc.Metadata, listener: InterceptingListener | grpc.Listener) => void,
          ) {
            mockMetadataRes = metadata;
            next(metadata, listener);
          },
        });
      });

      const clientProxy = await client.proxy.create<DaprClientGrpc>(DaprClientGrpc, {
        interceptors: [mockInterceptor],
      });

      await new Promise((resolve) => clientProxy.getMetadata(new Empty(), resolve));

      expect(mockInterceptor.mock.calls.length).toBe(1);
      expect(mockMetadataRes.get("dapr-app-id")[0]).toBe(process.env.APP_ID);
      process.env.APP_ID = oldProcessAppId;
    });
  });

  describe("sidecar", () => {
    it("should return true if the sidecar has been started", async () => {
      await client.daprClient.getClient();

      // Note: difficult to test as we start up dapr with dapr run, which starts the sidecar for us automatically
      // there is however a delay between the sidecar being ready and the app starting as they are started asynchronously
      // if Dapr has to connect to a component, it might introduce a delay
      // the test will thus randomly have isStarted = true or isStarted = false depending on the startup delay of the sidecar
      await client.health.isHealthy();
      // expect(isHealthy).toBe(false);
    });
  });

  describe("metadata", () => {
    it("should be able to get the metadata of the Dapr sidecar", async () => {
      await client.metadata.get();

      // app id is not set in grpc?
      // expect(res.id.length).toBeGreaterThan(0);
      // expect(res.components.length).toBeGreaterThan(0);
    });

    // Commenting out as it would need next version of Dapr to be used in E2E test.
    // It would specifically require changes from https://github.com/dapr/dapr/pull/5052
    // it('should be able to get the capabilities of components via metadata call', async () => {
    //   const res = await client.metadata.get();
    //   const redisStateComponent = res.components.filter( (component) => component.name == "state-redis" );
    //   const expectedRedisStateCapabilities = [ 'ETAG', 'TRANSACTIONAL', 'ACTOR' ];
    //   expect(res.id.length).toBeGreaterThan(0);
    //   expect(res.components.length).toBeGreaterThan(0);
    //   expect(redisStateComponent.length).toEqual(1)
    //   expect(redisStateComponent[0].capabilities).toEqual(expect.arrayContaining(expectedRedisStateCapabilities));
    // });

    it("should be able to set a custom metadata value of the Dapr sidecar", async () => {
      await client.metadata.set("testKey", "Hello World");

      const res = await client.metadata.get();

      // app id is not set in grpc?
      // expect(res.id.length).toBeGreaterThan(0);
      // expect(res.components.length).toBeGreaterThan(0);
      expect(res.extended["testKey"]).toEqual("Hello World");
    });
  });

  describe("health", () => {
    it("should return true if Dapr is ready", async () => {
      const res = await client.health.isHealthy();
      expect(res).toEqual(true);
    });
  });

  describe("secrets", () => {
    it("should be able to correctly fetch the secrets by a single key", async () => {
      const res = await client.secret.get("secret-envvars", "TEST_SECRET_1");
      expect(JSON.stringify(res)).toEqual(`{"TEST_SECRET_1":"secret_val_1"}`);
    });

    it("should be able to correctly fetch the secrets in bulk", async () => {
      const res = await client.secret.getBulk("secret-envvars");
      expect(Object.keys(res).length).toBeGreaterThan(1);
    });
  });

  describe("configuration", () => {
    beforeEach(async () => {
      // Reset the Configuration API
      await DockerUtils.executeDockerCommand("dapr_redis redis-cli MSET myconfigkey1 key1_initialvalue||1");
      await DockerUtils.executeDockerCommand("dapr_redis redis-cli MSET myconfigkey2 key2_initialvalue||1");
      await DockerUtils.executeDockerCommand("dapr_redis redis-cli MSET myconfigkey3 key3_initialvalue||1");
    });

    it("should be able to get the configuration items", async () => {
      const config = await client.configuration.get("config-redis", ["myconfigkey1", "myconfigkey2", "myconfigkey3"]);
      expect(Object.keys(config.items).length).toEqual(3);
      expect("myconfigkey1" in config.items);
      expect("myconfigkey2" in config.items);
      expect("myconfigkey3" in config.items);

      expect(config.items["myconfigkey3"].value == "key1_initialvalue");
      expect(config.items["myconfigkey3"].value == "key2_initialvalue");
      expect(config.items["myconfigkey3"].value == "key3_initialvalue");
    });

    it("should be able to get the configuration items with metadata", async () => {
      await client.configuration.get("config-redis", ["myconfigkey1"], {
        hello: "world",
      });

      // Disabled for now as I am unsure if Dapr returns the metadata items
      // Java SDK: https://github.com/dapr/java-sdk/blob/06d92dafca62a6b48e74ccf939feeac7189e360f/sdk/src/test/java/io/dapr/client/DaprPreviewClientGrpcTest.java#L119
      // ^ shows that it is not being tested, it tries but doesn't assert
      // expect(conf.items.filter(i => i.key == "myconfigkey1")[0].metadata).toHaveProperty("hello");
    });

    it("should be able to subscribe to configuration item changes on all keys", async () => {
      const m = jest.fn(async (_res: SubscribeConfigurationResponse) => {
        return;
      });

      const stream = await client.configuration.subscribe("config-redis", m);

      // Update the configuration item
      await DockerUtils.executeDockerCommand("dapr_redis redis-cli MSET myconfigkey3 mynewvalue||2");

      expect(Object.keys(m.mock.calls[0][0].items).length).toEqual(1);
      expect("myconfigkey3" in m.mock.calls[0][0].items);
      expect(m.mock.calls[0][0].items["myconfigkey3"].value).toEqual("mynewvalue");

      stream.stop();
    });

    it("should be able to subscribe to configuration item changes on specific keys", async () => {
      const m = jest.fn(async (_res: SubscribeConfigurationResponse) => {
        return;
      });

      const stream = await client.configuration.subscribeWithKeys("config-redis", ["myconfigkey1", "myconfigkey2"], m);
      await DockerUtils.executeDockerCommand("dapr_redis redis-cli MSET myconfigkey1 key1_mynewvalue||1");

      expect(Object.keys(m.mock.calls[0][0].items).length).toEqual(1);
      expect("myconfigkey1" in m.mock.calls[0][0].items);
      expect(m.mock.calls[0][0].items["myconfigkey1"].value).toEqual("key1_mynewvalue");

      stream.stop();
    });

    it("should be able to subscribe with metadata", async () => {
      const m = jest.fn(async (_res: SubscribeConfigurationResponse) => {
        return;
      });

      const stream1 = await client.configuration.subscribeWithMetadata(
        "config-redis",
        ["myconfigkey1", "myconfigkey2"],
        { hello: "world" },
        m,
      );
      await DockerUtils.executeDockerCommand("dapr_redis redis-cli MSET myconfigkey1 key1_mynewvalue||1");

      expect(Object.keys(m.mock.calls[0][0].items).length).toEqual(1);
      expect("myconfigkey1" in m.mock.calls[0][0].items);
      expect(m.mock.calls[0][0].items["myconfigkey1"].value).toEqual("key1_mynewvalue");

      stream1.stop();
    });

    it("should be able to unsubscribe", async () => {
      const m = jest.fn(async (_res: SubscribeConfigurationResponse) => {
        return;
      });

      const stream = await client.configuration.subscribeWithMetadata(
        "config-redis",
        ["myconfigkey1", "myconfigkey2"],
        { hello: "world" },
        m,
      );
      await DockerUtils.executeDockerCommand("dapr_redis redis-cli MSET myconfigkey1 key1_mynewvalue||1");

      expect(Object.keys(m.mock.calls[0][0].items).length).toEqual(1);
      expect("myconfigkey1" in m.mock.calls[0][0].items);
      expect(m.mock.calls[0][0].items["myconfigkey1"].value).toEqual("key1_mynewvalue");

      stream.stop();

      await DockerUtils.executeDockerCommand("dapr_redis redis-cli MSET myconfigkey1 key1_mynewvalue2||1");

      // Expect no change after stop
      expect(Object.keys(m.mock.calls[0][0].items).length).toEqual(1);
      expect("myconfigkey1" in m.mock.calls[0][0].items);
      expect(m.mock.calls[0][0].items["myconfigkey1"].value).toEqual("key1_mynewvalue");
    });

    it("should be able to subscribe to configuration items through multiple streams", async () => {
      const m1 = jest.fn(async (_res: SubscribeConfigurationResponse) => {
        return;
      });
      const m2 = jest.fn(async (_res: SubscribeConfigurationResponse) => {
        return;
      });

      const stream1 = await client.configuration.subscribeWithKeys("config-redis", ["myconfigkey1"], m1);
      const stream2 = await client.configuration.subscribeWithKeys("config-redis", ["myconfigkey1"], m2);

      await DockerUtils.executeDockerCommand("dapr_redis redis-cli MSET myconfigkey1 key1_mynewvalue||1");

      expect(Object.keys(m1.mock.calls[0][0].items).length).toEqual(1);
      expect("myconfigkey1" in m1.mock.calls[0][0].items);
      expect(m1.mock.calls[0][0].items["myconfigkey1"].value).toEqual("key1_mynewvalue");

      expect(Object.keys(m2.mock.calls[0][0].items).length).toEqual(1);
      expect("myconfigkey1" in m2.mock.calls[0][0].items);
      expect(m2.mock.calls[0][0].items["myconfigkey1"].value).toEqual("key1_mynewvalue");

      stream1.stop();
      stream2.stop();
    });
  });
});
