"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLRPConnection = void 0;
/*
  This file is responsible for all functions that gonna be executed on TCP events
  Also it sends and receives messages and parameters from reader
*/
const net = __importStar(require("net"));
const events_1 = require("events");
const Int64 = require("node-int64");
// LLRP Message Class
const messageLLRP_1 = require("./messageLLRP");
// LLRP Get Message Class
const getMessageLLRP_1 = require("./getMessageLLRP");
// Decoders
const decode_1 = require("./actions/decode");
// Constants
const parameterConstants_1 = __importDefault(require("./constants/parameterConstants"));
// Interfaces
const llrpInterface_1 = require("./interfaces/llrpInterface");
const messagesTypesInterface_1 = require("./interfaces/messagesTypesInterface");
const defaultRoSpecId = 1;
class LLRPConnection extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.port = 5084;
        this.enableTransmitter = true;
        this.isStartROSpecSent = false;
        this.isReaderConfigSet = false;
        this.isReaderConfigReset = false;
        this.allReaderRospecDeleted = false;
        this.allReaderAccessSpecDeleted = false;
        this.isExtensionsEnabled = false;
        this.sendEnableRospecOnceMore = true;
        this.radioOperationConfig = {};
        this.socket = new net.Socket();
        this.client = null;
        this.connected = false;
        this.ipaddress = config.ipaddress;
        this.port = config.port || this.port;
        this.radioOperationConfig = config.radioOperationConfig;
        this.radioOperationConfig.antennasConfig =
            config.radioOperationConfig.antennasConfig || [];
        this.radioOperationConfig.enableReadingTid =
            config.radioOperationConfig.enableReadingTid || false;
        this.isReaderConfigSet = config.isReaderConfigSet || this.isReaderConfigSet;
        this.isStartROSpecSent = config.isStartROSpecSent || this.isStartROSpecSent;
        this.isReaderConfigReset =
            config.isReaderConfigReset || this.isReaderConfigReset;
    }
    connect() {
        this.enableTransmitter = true;
        this.socket.setTimeout(60000, () => {
            if (this.connected) {
                console.log("Connection timeout");
                process.nextTick(() => {
                    this.connected = false;
                    this.emit(llrpInterface_1.RfidReaderEvent.Timeout, new Error("Connection timeout"));
                });
            }
        });
        // connect with reader
        this.client = this.socket.connect(this.port, this.ipaddress, () => {
            console.log(`Connected to ${this.ipaddress}:${this.port}`);
            process.nextTick(() => {
                this.emit(llrpInterface_1.RfidReaderEvent.Connected);
            });
        });
        // whenever reader sends data.
        this.client.on("data", (data) => {
            this.handleReceivedData(data);
        });
        // // the reader or client has ended the connection.
        this.client.on("end", () => {
            // the session has ended
            console.log("client disconnected");
            process.nextTick(() => {
                this.connected = false;
            });
        });
        this.client.on("error", (err) => {
            // error on the connection
            console.log(err);
            process.nextTick(() => {
                this.connected = false;
                this.emit(llrpInterface_1.RfidReaderEvent.Error, err);
            });
        });
    }
    disconnect() {
        if (this.socket.destroyed) {
            return false;
        }
        this.connected = false;
        this.sendMessage(this.client, getMessageLLRP_1.getMessageLLRP.deleteRoSpec(defaultRoSpecId));
        this.resetIsStartROSpecSent();
        console.log("Reader is disconnected");
        return true;
    }
    disableRFTransmitter() {
        if (this.socket.destroyed) {
            return false;
        }
        this.enableTransmitter = false;
        // this.sendMessage(this.client, GetLlrpMessage.disableRoSpec(defaultRoSpecId));
        // this.resetIsStartROSpecSent();
        console.log("Sending: disableRoSpec");
        console.log("resetIsStartROSpecSent");
        return true;
    }
    enableRFTransmitter() {
        if (this.socket.destroyed) {
            return false;
        }
        this.enableTransmitter = true;
        // this.sendEnableRospec(true);
        console.log("sendEnableRospec(true)");
        return true;
    }
    mapSubParameters(decodedParameters) {
        // create an object that will hold a key valuemapSubParameters pair.
        const properties = {};
        const subP = decodedParameters.subParameters;
        for (const tag in subP) {
            // where key is the Parameter type.
            // and value is the Parameter value as Buffer object.
            properties[subP[tag].type] = subP[tag].value;
        }
        return properties;
    }
    handleReceivedData(data) {
        process.nextTick(() => {
            if (!data) {
                console.log("Undefined data returned by RFID server");
            }
            const messagesKeyValue = decode_1.decodeMessage(data);
            for (const index in messagesKeyValue) {
                const message = new messageLLRP_1.LLRPMessage(messagesKeyValue[index]);
                console.log(`Receiving: ${message.getTypeName()}`);
                switch (message.getType()) {
                    case messagesTypesInterface_1.MessagesType.READER_EVENT_NOTIFICATION:
                        this.handleReaderNotification(message);
                        break;
                    case messagesTypesInterface_1.MessagesType.DELETE_ACCESSSPEC_RESPONSE:
                    case messagesTypesInterface_1.MessagesType.SET_READER_CONFIG_RESPONSE:
                        this.handleReaderConfiguration();
                        break;
                    case messagesTypesInterface_1.MessagesType.ADD_ROSPEC_RESPONSE:
                        this.sendEnableRospec(true);
                        break;
                    case messagesTypesInterface_1.MessagesType.DELETE_ROSPEC_RESPONSE:
                        if (!this.allReaderRospecDeleted) {
                            this.allReaderRospecDeleted = true;
                            this.handleReaderConfiguration();
                        }
                        else {
                            this.sendMessage(this.client, getMessageLLRP_1.getMessageLLRP.closeConnection());
                        }
                        break;
                    case messagesTypesInterface_1.MessagesType.CUSTOM_MESSAGE:
                        this.handleReaderConfiguration();
                        break;
                    case messagesTypesInterface_1.MessagesType.ENABLE_ROSPEC_RESPONSE:
                        if (this.sendEnableRospecOnceMore) {
                            this.sendEnableRospec(false);
                        }
                        else {
                            this.sendStartROSpec();
                        }
                        break;
                    case messagesTypesInterface_1.MessagesType.RO_ACCESS_REPORT:
                        this.handleROAccessReport(message);
                        break;
                }
            }
        });
    }
    handleReaderNotification(message) {
        const parametersKeyValue = decode_1.decodeParameter(message.getParameter());
        parametersKeyValue.forEach((decodedParameters) => {
            if (decodedParameters.type ===
                parameterConstants_1.default.ReaderEventNotificationData) {
                const subParameters = this.mapSubParameters(decodedParameters);
                if (subParameters[parameterConstants_1.default.ROSpecEvent]) {
                    // Event type is End of ROSpec
                    if (subParameters[parameterConstants_1.default.ROSpecEvent].readUInt8(0) === 1) {
                        // We only have 1 ROSpec so obviously it would be that.
                        // So we would not care about the ROSpecID and
                        // just reset flag for START_ROSPEC.
                        this.resetIsStartROSpecSent();
                    }
                }
            }
        });
        if (!this.enableTransmitter) {
            return;
        }
        // global configuration and enabling reports has not been set.
        if (!this.isReaderConfigReset) {
            // reset them.
            this.client.write(getMessageLLRP_1.getMessageLLRP.resetConfigurationToFactoryDefaults());
            this.isReaderConfigReset = true; // we have reset the reader configuration.
        }
        else {
            this.sendStartROSpec();
        }
    }
    resetIsStartROSpecSent() {
        this.isStartROSpecSent = false;
    }
    sendEnableRospec(sendTwoTimes) {
        this.sendEnableRospecOnceMore = sendTwoTimes ? true : false;
        this.sendMessage(this.client, getMessageLLRP_1.getMessageLLRP.enableRoSpec(defaultRoSpecId));
    }
    sendStartROSpec() {
        // START_ROSPEC has not been sent.
        if (!this.isStartROSpecSent) {
            this.isStartROSpecSent = true; // change state of flag.
            this.sendMessage(this.client, getMessageLLRP_1.getMessageLLRP.startRoSpec(defaultRoSpecId));
        }
    }
    handleReaderConfiguration() {
        if (!this.allReaderAccessSpecDeleted) {
            this.sendMessage(this.client, getMessageLLRP_1.getMessageLLRP.deleteAllAccessSpec());
            this.allReaderAccessSpecDeleted = true;
        }
        else if (!this.allReaderRospecDeleted) {
            this.sendMessage(this.client, getMessageLLRP_1.getMessageLLRP.deleteAllROSpecs());
        }
        else if (!this.isExtensionsEnabled) {
            // enable extensions for impinj reader
            this.sendMessage(this.client, getMessageLLRP_1.getMessageLLRP.enableExtensions());
            this.isExtensionsEnabled = true;
        }
        else if (!this.isReaderConfigSet) {
            // set them.
            this.sendMessage(this.client, getMessageLLRP_1.getMessageLLRP.setReaderConfig()); // send SET_READER_CONFIG, global reader configuration in reading tags.
            this.isReaderConfigSet = true; // we have set the reader configuration.
        }
        else {
            this.sendMessage(this.client, getMessageLLRP_1.getMessageLLRP.addRoSpec(defaultRoSpecId, this.radioOperationConfig));
        }
    }
    handleROAccessReport(message) {
        process.nextTick(() => {
            // show current date.
            // console.log(`RO_ACCESS_REPORT at ${new Date().toString()}`);
            // read Parameters
            // this contains the TagReportData
            const parametersKeyValue = decode_1.decodeParameter(message.getParameter());
            if (parametersKeyValue) {
                parametersKeyValue.forEach((decodedParameters) => {
                    // read TagReportData Parameter only.
                    if (decodedParameters.type === parameterConstants_1.default.TagReportData) {
                        const tag = {};
                        const subParameters = this.mapSubParameters(decodedParameters);
                        if (subParameters[parameterConstants_1.default.EPC96]) {
                            tag.EPC96 = subParameters[parameterConstants_1.default.EPC96].toString("hex");
                        }
                        if (subParameters[parameterConstants_1.default.EPCData]) {
                            tag.EPCData = subParameters[parameterConstants_1.default.EPCData].toString("hex");
                        }
                        if (subParameters[parameterConstants_1.default.AntennaID]) {
                            tag.antennaID = subParameters[parameterConstants_1.default.AntennaID].readUInt16BE(0);
                        }
                        if (subParameters[parameterConstants_1.default.TagSeenCount]) {
                            tag.tagSeenCount = subParameters[parameterConstants_1.default.TagSeenCount].readUInt16BE(0);
                        }
                        if (subParameters[parameterConstants_1.default.PeakRSSI]) {
                            tag.peakRSSI = subParameters[parameterConstants_1.default.PeakRSSI].readInt8(0);
                        }
                        if (subParameters[parameterConstants_1.default.ROSpecID]) {
                            tag.roSpecID = subParameters[parameterConstants_1.default.ROSpecID].readUInt32BE(0);
                        }
                        if (subParameters[parameterConstants_1.default.SpecIndex]) {
                            tag.specIndex = subParameters[parameterConstants_1.default.SpecIndex].readUInt16BE(0);
                        }
                        if (subParameters[parameterConstants_1.default.InventoryParameterSpecID]) {
                            tag.inventoryParameterSpecID = subParameters[parameterConstants_1.default.InventoryParameterSpecID].readUInt16BE(0);
                        }
                        if (subParameters[parameterConstants_1.default.ChannelIndex]) {
                            tag.channelIndex = subParameters[parameterConstants_1.default.ChannelIndex].readUInt16BE(0);
                        }
                        if (subParameters[parameterConstants_1.default.C1G2PC]) {
                            tag.C1G2PC = subParameters[parameterConstants_1.default.C1G2PC].readUInt16BE(0);
                        }
                        if (subParameters[parameterConstants_1.default.C1G2CRC]) {
                            tag.C1G2CRC = subParameters[parameterConstants_1.default.C1G2CRC].readUInt16BE(0);
                        }
                        if (subParameters[parameterConstants_1.default.AccessSpecID]) {
                            tag.accessSpecID = subParameters[parameterConstants_1.default.AccessSpecID].readUInt32BE(0);
                        }
                        if (subParameters[parameterConstants_1.default.FirstSeenTimestampUTC]) {
                            // Note: Here is losing precision because JS numbers are defined to be double floats
                            const firstSeenTimestampUTCus = new Int64(subParameters[parameterConstants_1.default.FirstSeenTimestampUTC], 0);
                            tag.firstSeenTimestampUTC = firstSeenTimestampUTCus.toNumber(true); // microseconds
                        }
                        if (subParameters[parameterConstants_1.default.LastSeenTimestampUTC]) {
                            // Note: Here is losing precision because JS numbers are defined to be double floats
                            const lastSeenTimestampUTCus = new Int64(subParameters[parameterConstants_1.default.LastSeenTimestampUTC], 0);
                            tag.lastSeenTimestampUTC = lastSeenTimestampUTCus.toNumber(true); // microseconds
                        }
                        // if (subParameters[ParameterConstants.Custom]) {
                        //   tag.custom = subParameters[ParameterConstants.Custom].toString(
                        //     "hex"
                        //   );
                        //   if (
                        //     this.radioOperationConfig.enableReadingTid &&
                        //     this.isExtensionsEnabled
                        //   ) {
                        //     // parse impinj parameter
                        //     const impinjParameterSubtype: number = subParameters[
                        //       ParameterConstants.Custom
                        //     ].readUInt32BE(4);
                        //     switch (impinjParameterSubtype) {
                        //       case CustomParameterSubType.IMPINJ_SERIALIZED_TID:
                        //         tag.TID = subParameters[
                        //           ParameterConstants.Custom
                        //         ].toString("hex", 10);
                        //         break;
                        //     }
                        //   }
                        // }
                        // console.log(
                        //   `\tEPCData: ${tag.EPCData} \tEPC96: ${tag.EPC96} \tTID: ${tag.TID} \tRead count: ${tag.tagSeenCount} \tAntenna ID: ${tag.antennaID} \tLastSeenTimestampUTC: ${tag.lastSeenTimestampUTC}`
                        // );
                        if (tag.TID || tag.EPCData || tag.EPC96) {
                            process.nextTick(() => {
                                this.emit(llrpInterface_1.RfidReaderEvent.DidSeeTag, tag);
                            });
                        }
                    }
                });
            }
        });
    }
    sendMessage(client, buffer) {
        if (!client || (client && client.destroyed)) {
            return;
        }
        process.nextTick(() => {
            console.log(`Sending ${this.getMessageName(buffer)}`);
            this.client.write(buffer);
        });
    }
    getMessageName(data) {
        // get the message code
        // get the name from the constants.
        return messagesTypesInterface_1.MessagesType[this.getMessage(data)];
    }
    getMessage(data) {
        // message type resides on the first 2 bits of the first octet
        // and 8 bits of the second octet.
        return ((data[0] & 3) << 8) | data[1];
    }
}
exports.LLRPConnection = LLRPConnection;
