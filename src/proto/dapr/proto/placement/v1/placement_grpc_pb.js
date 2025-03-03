// GENERATED CODE -- DO NOT EDIT!

// Original file comments:
//
// Copyright 2021 The Dapr Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
'use strict';
var grpc = require('@grpc/grpc-js');
var dapr_proto_placement_v1_placement_pb = require('../../../../dapr/proto/placement/v1/placement_pb.js');
var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');

function serialize_dapr_proto_placement_v1_GetPlacementTablesResponse(arg) {
  if (!(arg instanceof dapr_proto_placement_v1_placement_pb.GetPlacementTablesResponse)) {
    throw new Error('Expected argument of type dapr.proto.placement.v1.GetPlacementTablesResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_dapr_proto_placement_v1_GetPlacementTablesResponse(buffer_arg) {
  return dapr_proto_placement_v1_placement_pb.GetPlacementTablesResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_dapr_proto_placement_v1_Host(arg) {
  if (!(arg instanceof dapr_proto_placement_v1_placement_pb.Host)) {
    throw new Error('Expected argument of type dapr.proto.placement.v1.Host');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_dapr_proto_placement_v1_Host(buffer_arg) {
  return dapr_proto_placement_v1_placement_pb.Host.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_dapr_proto_placement_v1_PlacementOrder(arg) {
  if (!(arg instanceof dapr_proto_placement_v1_placement_pb.PlacementOrder)) {
    throw new Error('Expected argument of type dapr.proto.placement.v1.PlacementOrder');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_dapr_proto_placement_v1_PlacementOrder(buffer_arg) {
  return dapr_proto_placement_v1_placement_pb.PlacementOrder.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_google_protobuf_Empty(arg) {
  if (!(arg instanceof google_protobuf_empty_pb.Empty)) {
    throw new Error('Expected argument of type google.protobuf.Empty');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_google_protobuf_Empty(buffer_arg) {
  return google_protobuf_empty_pb.Empty.deserializeBinary(new Uint8Array(buffer_arg));
}


// Placement service is used to report Dapr runtime host status.
var PlacementService = exports.PlacementService = {
  // Returns current placement tables.
getPlacementTables: {
    path: '/dapr.proto.placement.v1.Placement/GetPlacementTables',
    requestStream: false,
    responseStream: false,
    requestType: google_protobuf_empty_pb.Empty,
    responseType: dapr_proto_placement_v1_placement_pb.GetPlacementTablesResponse,
    requestSerialize: serialize_google_protobuf_Empty,
    requestDeserialize: deserialize_google_protobuf_Empty,
    responseSerialize: serialize_dapr_proto_placement_v1_GetPlacementTablesResponse,
    responseDeserialize: deserialize_dapr_proto_placement_v1_GetPlacementTablesResponse,
  },
  // Reports Dapr actor status and retrieves actor placement table.
reportDaprStatus: {
    path: '/dapr.proto.placement.v1.Placement/ReportDaprStatus',
    requestStream: true,
    responseStream: true,
    requestType: dapr_proto_placement_v1_placement_pb.Host,
    responseType: dapr_proto_placement_v1_placement_pb.PlacementOrder,
    requestSerialize: serialize_dapr_proto_placement_v1_Host,
    requestDeserialize: deserialize_dapr_proto_placement_v1_Host,
    responseSerialize: serialize_dapr_proto_placement_v1_PlacementOrder,
    responseDeserialize: deserialize_dapr_proto_placement_v1_PlacementOrder,
  },
};

exports.PlacementClient = grpc.makeGenericClientConstructor(PlacementService);
