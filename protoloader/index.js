import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import dotenv from 'dotenv';
dotenv.config();


const PROTO_PATH = process.env.PROTO_PATH;

const server = new grpc.Server();

const packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    }
);


const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const user = protoDescriptor.user.UserService;

export default {
  server, user
}