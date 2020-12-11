/* This file is responsible for handling TCP connection to Reader (10.12.2020) */

import { LLRPConnection } from "./LLRP/mainLLRP.js";

// Proto config
const config = {
  IP_ADDRESS: "192.168.1.137",
  PORT: 5084,
};

const reader = LLRPConnection(config);

console.log(reader);

// Create TCP connection
reader.handleConnection();

// Listen for TCP data
reader.handleData();

// Close TCP connection
reader.handleClose();

// Process listens ctrl+c terminal
process.on("SIGINT", () => {
  console.log("Process finished with ctrl+c");
  processExit();
});

// Process catches uncaught exceptions
process.on("uncaughtException", (err, origin) => {
  console.log(`Caught exception: ${err}`);
  console.log(`Exception origin: ${origin}`);
  processExit();
});

// Process catches unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  console.log(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  processExit();
});

const processExit = () => {
  // Close TCP connection
  reader.handleDestroy();
  // Set timeout to wait till TCP get destroyed (Should remove later?)
  setTimeout(() => {
    process.exit(0);
  }, 1000);
};
