/* This file is responsible for handling TCP connection to Reader (10.12.2020) */

import net from "net";
import { LLRPConnection } from "./LLRP/mainLLRP";

import {
  ReaderConfig,
  RfidReaderEvent,
  TagInformation,
} from "./LLRP/interfaces/llrpInterface";

const config: ReaderConfig = {
  ipaddress: "192.168.1.142",
  port: 5084,
  radioOperationConfig: {
    enableReadingTid: true,
    modeIndex: 3,
    tagPopulation: 4,
    channelIndex: 1,
    inventorySearchMode: 1, // 1 - Single target (impinj custom parameter)
    antennasConfig: [{ number: 0, power: 31.5 }],
  },
};

const server = net.createServer(() => {
  console.log("TCP server created");
});

server.listen(8124, () => {
  const reader: LLRPConnection = new LLRPConnection(config);

  reader.connect();

  reader.on(RfidReaderEvent.Timeout, () => {
    console.log("timeout");
  });

  reader.on(RfidReaderEvent.DisabledRadioOperation, () => {
    console.log("disabledRadioOperation");
  });

  reader.on(RfidReaderEvent.StartedRadioOperation, () => {
    console.log("startedRadioOperation");
  });

  reader.on(RfidReaderEvent.DidSeeTag, (tag: TagInformation) => {
    console.log(tag.EPC96);
  });

  reader.on(RfidReaderEvent.LlrpError, (error: Error) => {
    console.log("protocol error:", error);
  });

  reader.on(RfidReaderEvent.Error, (error: any) => {
    console.log(`error: JSON.stringify(${error})`);
  });

  reader.on(RfidReaderEvent.Disconnect, (error: Error) => {
    console.log("Reader disconnect", error);
  });

  // Process listens ctrl+c terminal
  process.on("SIGINT", () => {
    console.log("Process finished with ctrl+c");
    processExit();
  });

  // Process catches uncaught exceptions
  process.on("uncaughtException", (err: any, origin: any) => {
    console.log(`Caught exception: ${err}`);
    console.log(`Line us ${err.stack}`);
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
    reader.disconnect();
    // Set timeout to wait till TCP get destroyed (Should remove later?)
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  };
});
