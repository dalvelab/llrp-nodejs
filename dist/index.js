"use strict";
/* This file is responsible for handling TCP connection to Reader (10.12.2020) */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = __importDefault(require("net"));
const mainLLRP_1 = require("./LLRP/mainLLRP");
const llrpInterface_1 = require("./LLRP/interfaces/llrpInterface");
const config = {
    ipaddress: "192.168.1.142",
    port: 5084,
    radioOperationConfig: {
        enableReadingTid: true,
        modeIndex: 3,
        tagPopulation: 4,
        channelIndex: 1,
        inventorySearchMode: 1,
        antennasConfig: [{ number: 0, power: 31.5 }],
    },
};
const server = net_1.default.createServer(() => {
    console.log("TCP server created");
});
server.listen(8124, () => {
    const reader = new mainLLRP_1.LLRPConnection(config);
    reader.connect();
    reader.on(llrpInterface_1.RfidReaderEvent.Timeout, () => {
        console.log("timeout");
    });
    reader.on(llrpInterface_1.RfidReaderEvent.DisabledRadioOperation, () => {
        console.log("disabledRadioOperation");
    });
    reader.on(llrpInterface_1.RfidReaderEvent.StartedRadioOperation, () => {
        console.log("startedRadioOperation");
    });
    reader.on(llrpInterface_1.RfidReaderEvent.DidSeeTag, (tag) => {
        console.log(tag.EPC96);
    });
    reader.on(llrpInterface_1.RfidReaderEvent.LlrpError, (error) => {
        console.log("protocol error:", error);
    });
    reader.on(llrpInterface_1.RfidReaderEvent.Error, (error) => {
        console.log(`error: JSON.stringify(${error})`);
    });
    reader.on(llrpInterface_1.RfidReaderEvent.Disconnect, (error) => {
        console.log("Reader disconnect", error);
    });
    // Process listens ctrl+c terminal
    process.on("SIGINT", () => {
        console.log("Process finished with ctrl+c");
        processExit();
    });
    // Process catches uncaught exceptions
    process.on("uncaughtException", (err, origin) => {
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
