//
// // lib/mongo.ts
// import mongoose from "mongoose";
//
// declare global {
//   // eslint-disable-next-line no-var
//   var _mongoConn: Promise<typeof mongoose> | undefined;
// }
//
// export async function connectMongo() {
//   if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
//   if (!global._mongoConn) {
//     global._mongoConn = mongoose.connect(process.env.MONGODB_URI, {
//       dbName: "meeting-ai",
//     });
//   }
//   return global._mongoConn;
// }
//
//
import mongoose from "mongoose";

declare global {
  var __mongoConn: Promise<typeof mongoose> | undefined;
}

export async function connectMongo() {
  if (global.__mongoConn) return global.__mongoConn;

  const uri = process.env.MONGODB_URI!;
  if (!uri) throw new Error("MONGODB_URI missing");

  global.__mongoConn = mongoose.connect(uri, {
    tls: true,
    tlsAllowInvalidCertificates: true, // bypass cert check in dev
    serverSelectionTimeoutMS: 10000,
  });

  return global.__mongoConn;
}

