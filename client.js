/* This file is responsible for handling TCP connection to Reader (10.12.2020) */

import net from "net";

import { handleReaderData } from "./LLRP/mainLLRP.js";

const client = new net.Socket();

// Proto config
const IP_ADDRESS = "192.168.1.143";
const PORT = 5084;

// Create TCP connection
client.connect(PORT, IP_ADDRESS, function () {
  console.log(`Reader ${IP_ADDRESS} is connected`);
});

// Listen for TCP data
client.on("data", function (data) {
  handleReaderData(data);
});

// Close TCP connection
client.on("close", function () {
  console.log("Connection closed");
});

// Process listen ctrl+c terminal
process.on("SIGINT", () => {
  console.log("Process finished with ctrl+c");
  processExit();
});

// catches uncaught exceptions
process.on("uncaughtException", () => {
  console.log("uncaughtException");
  processExit();
});

// catches unhandled promise rejection
process.on("unhandledRejection", () => {
  console.log("unhandledRejection");
  processExit();
});

const processExit = () => {
  // Close TCP connection
  client.destroy();
  // Set timeout to wait till TCP get destroyed (Should remove later?)
  setTimeout(() => {
    process.exit(0);
  }, 1000);
};
