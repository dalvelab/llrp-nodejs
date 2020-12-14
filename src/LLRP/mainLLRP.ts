/*
  This file is responsible for all functions that gonna be executed on TCP events
  Also it sends and receives messages and parameters from reader  
*/
import * as net from "net";
import { EventEmitter } from "events";
import Int64 = require("node-int64");

// LLRP Message Class
import { LLRPMessage } from "./messageLLRP";

// LLRP Get Message Class
import { getMessageLLRP } from "./getMessageLLRP";

// Decoders
import { decodeMessage, decodeParameter } from "./actions/decode";

// Constants
import ParameterConstants from "./constants/parameterConstants";

// Interfaces
import {
  LLRPReader,
  ReaderConfig,
  RfidReaderEvent,
  RadioOperationConfig,
  TagInformation,
} from "./interfaces/llrpInterface";

import {
  ObjectMessageElement,
  ObjectParameterElement,
} from "./interfaces/decodeInterface";
import { LlrpMessage } from "./interfaces/llrpMessageInterface";
import { MessagesType } from "./interfaces/messagesTypesInterface";

const defaultRoSpecId: number = 1;

export class LLRPConnection extends EventEmitter implements LLRPReader {
  private ipaddress: string;
  private port: number = 5084;
  private enableTransmitter: boolean = true;
  private isStartROSpecSent: boolean = false;
  private isReaderConfigSet: boolean = false;
  private isReaderConfigReset: boolean = false;
  private allReaderRospecDeleted: boolean = false;
  private allReaderAccessSpecDeleted: boolean = false;
  private isExtensionsEnabled: boolean = false;
  private sendEnableRospecOnceMore: boolean = true;
  private radioOperationConfig: RadioOperationConfig = <RadioOperationConfig>{};

  private socket: net.Socket = new net.Socket();
  private client: any = null;
  public connected: boolean = false;

  constructor(config: ReaderConfig) {
    super();

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

  public connect(): void {
    this.enableTransmitter = true;

    this.socket.setTimeout(60000, () => {
      if (this.connected) {
        console.log("Connection timeout");
        process.nextTick(() => {
          this.connected = false;
          this.emit(RfidReaderEvent.Timeout, new Error("Connection timeout"));
        });
      }
    });

    // connect with reader
    this.client = this.socket.connect(this.port, this.ipaddress, () => {
      console.log(`Connected to ${this.ipaddress}:${this.port}`);
      process.nextTick(() => {
        this.emit(RfidReaderEvent.Connected);
      });
    });

    // whenever reader sends data.
    this.client.on("data", (data: any) => {
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

    this.client.on("error", (err: any) => {
      // error on the connection
      console.log(err);
      process.nextTick(() => {
        this.connected = false;
        this.emit(RfidReaderEvent.Error, err);
      });
    });
  }

  public disconnect(): boolean {
    if (this.socket.destroyed) {
      return false;
    }

    this.connected = false;
    this.sendMessage(this.client, getMessageLLRP.deleteRoSpec(defaultRoSpecId));
    this.resetIsStartROSpecSent();
    console.log("Reader is disconnected");

    return true;
  }

  public disableRFTransmitter(): boolean {
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

  public enableRFTransmitter(): boolean {
    if (this.socket.destroyed) {
      return false;
    }
    this.enableTransmitter = true;
    // this.sendEnableRospec(true);
    console.log("sendEnableRospec(true)");

    return true;
  }

  private mapSubParameters(decodedParameters: any): any {
    // create an object that will hold a key valuemapSubParameters pair.
    const properties: any = {};
    const subP: any = decodedParameters.subParameters;
    for (const tag in subP) {
      // where key is the Parameter type.
      // and value is the Parameter value as Buffer object.
      properties[subP[tag].type] = subP[tag].value;
    }

    return properties;
  }

  private handleReceivedData(data: Buffer): void {
    process.nextTick(() => {
      if (!data) {
        console.log("Undefined data returned by RFID server");
      }

      const messagesKeyValue: ObjectMessageElement[] = decodeMessage(data);

      for (const index in messagesKeyValue) {
        const message: LlrpMessage = new LLRPMessage(messagesKeyValue[index]);
        console.log(`Receiving: ${message.getTypeName()}`);

        switch (message.getType()) {
          case MessagesType.READER_EVENT_NOTIFICATION:
            this.handleReaderNotification(message);
            break;
          case MessagesType.DELETE_ACCESSSPEC_RESPONSE:
          case MessagesType.SET_READER_CONFIG_RESPONSE:
            this.handleReaderConfiguration();
            break;
          case MessagesType.ADD_ROSPEC_RESPONSE:
            this.sendEnableRospec(true);
            break;
          case MessagesType.DELETE_ROSPEC_RESPONSE:
            if (!this.allReaderRospecDeleted) {
              this.allReaderRospecDeleted = true;
              this.handleReaderConfiguration();
            } else {
              this.sendMessage(this.client, getMessageLLRP.closeConnection());
            }
            break;
          case MessagesType.CUSTOM_MESSAGE:
            this.handleReaderConfiguration();
            break;
          case MessagesType.ENABLE_ROSPEC_RESPONSE:
            if (this.sendEnableRospecOnceMore) {
              this.sendEnableRospec(false);
            } else {
              this.sendStartROSpec();
            }
            break;
          case MessagesType.RO_ACCESS_REPORT:
            this.handleROAccessReport(message);
            break;
        }
      }
    });
  }

  private handleReaderNotification(message: LlrpMessage): void {
    const parametersKeyValue: ObjectParameterElement[] = decodeParameter(
      message.getParameter()
    );

    parametersKeyValue.forEach((decodedParameters: ObjectParameterElement) => {
      if (
        decodedParameters.type ===
        ParameterConstants.ReaderEventNotificationData
      ) {
        const subParameters: any = this.mapSubParameters(decodedParameters);
        if (subParameters[ParameterConstants.ROSpecEvent]) {
          // Event type is End of ROSpec
          if (
            subParameters[ParameterConstants.ROSpecEvent].readUInt8(0) === 1
          ) {
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
      this.client.write(getMessageLLRP.resetConfigurationToFactoryDefaults());
      this.isReaderConfigReset = true; // we have reset the reader configuration.
    } else {
      this.sendStartROSpec();
    }
  }

  private resetIsStartROSpecSent(): void {
    this.isStartROSpecSent = false;
  }

  private sendEnableRospec(sendTwoTimes: boolean): void {
    this.sendEnableRospecOnceMore = sendTwoTimes ? true : false;
    this.sendMessage(this.client, getMessageLLRP.enableRoSpec(defaultRoSpecId));
  }

  private sendStartROSpec(): void {
    // START_ROSPEC has not been sent.
    if (!this.isStartROSpecSent) {
      this.isStartROSpecSent = true; // change state of flag.
      this.sendMessage(
        this.client,
        getMessageLLRP.startRoSpec(defaultRoSpecId)
      );
    }
  }

  private handleReaderConfiguration(): void {
    if (!this.allReaderAccessSpecDeleted) {
      this.sendMessage(this.client, getMessageLLRP.deleteAllAccessSpec());
      this.allReaderAccessSpecDeleted = true;
    } else if (!this.allReaderRospecDeleted) {
      this.sendMessage(this.client, getMessageLLRP.deleteAllROSpecs());
    } else if (!this.isExtensionsEnabled) {
      // enable extensions for impinj reader
      this.sendMessage(this.client, getMessageLLRP.enableExtensions());
      this.isExtensionsEnabled = true;
    } else if (!this.isReaderConfigSet) {
      // set them.
      this.sendMessage(this.client, getMessageLLRP.setReaderConfig()); // send SET_READER_CONFIG, global reader configuration in reading tags.
      this.isReaderConfigSet = true; // we have set the reader configuration.
    } else {
      this.sendMessage(
        this.client,
        getMessageLLRP.addRoSpec(defaultRoSpecId, this.radioOperationConfig)
      );
    }
  }

  private handleROAccessReport(message: LlrpMessage): void {
    process.nextTick(() => {
      // show current date.
      // console.log(`RO_ACCESS_REPORT at ${new Date().toString()}`);

      // read Parameters
      // this contains the TagReportData
      const parametersKeyValue: ObjectParameterElement[] = decodeParameter(
        message.getParameter()
      );
      if (parametersKeyValue) {
        parametersKeyValue.forEach(
          (decodedParameters: ObjectParameterElement): void => {
            // read TagReportData Parameter only.
            if (decodedParameters.type === ParameterConstants.TagReportData) {
              const tag: TagInformation = <TagInformation>{};
              const subParameters: Buffer[] = this.mapSubParameters(
                decodedParameters
              );
              if (subParameters[ParameterConstants.EPC96]) {
                tag.EPC96 = subParameters[ParameterConstants.EPC96].toString(
                  "hex"
                );
              }

              if (subParameters[ParameterConstants.EPCData]) {
                tag.EPCData = subParameters[
                  ParameterConstants.EPCData
                ].toString("hex");
              }

              if (subParameters[ParameterConstants.AntennaID]) {
                tag.antennaID = subParameters[
                  ParameterConstants.AntennaID
                ].readUInt16BE(0);
              }

              if (subParameters[ParameterConstants.TagSeenCount]) {
                tag.tagSeenCount = subParameters[
                  ParameterConstants.TagSeenCount
                ].readUInt16BE(0);
              }

              if (subParameters[ParameterConstants.PeakRSSI]) {
                tag.peakRSSI = subParameters[
                  ParameterConstants.PeakRSSI
                ].readInt8(0);
              }

              if (subParameters[ParameterConstants.ROSpecID]) {
                tag.roSpecID = subParameters[
                  ParameterConstants.ROSpecID
                ].readUInt32BE(0);
              }

              if (subParameters[ParameterConstants.SpecIndex]) {
                tag.specIndex = subParameters[
                  ParameterConstants.SpecIndex
                ].readUInt16BE(0);
              }

              if (subParameters[ParameterConstants.InventoryParameterSpecID]) {
                tag.inventoryParameterSpecID = subParameters[
                  ParameterConstants.InventoryParameterSpecID
                ].readUInt16BE(0);
              }

              if (subParameters[ParameterConstants.ChannelIndex]) {
                tag.channelIndex = subParameters[
                  ParameterConstants.ChannelIndex
                ].readUInt16BE(0);
              }

              if (subParameters[ParameterConstants.C1G2PC]) {
                tag.C1G2PC = subParameters[
                  ParameterConstants.C1G2PC
                ].readUInt16BE(0);
              }

              if (subParameters[ParameterConstants.C1G2CRC]) {
                tag.C1G2CRC = subParameters[
                  ParameterConstants.C1G2CRC
                ].readUInt16BE(0);
              }

              if (subParameters[ParameterConstants.AccessSpecID]) {
                tag.accessSpecID = subParameters[
                  ParameterConstants.AccessSpecID
                ].readUInt32BE(0);
              }

              if (subParameters[ParameterConstants.FirstSeenTimestampUTC]) {
                // Note: Here is losing precision because JS numbers are defined to be double floats
                const firstSeenTimestampUTCus: Int64 = new Int64(
                  subParameters[ParameterConstants.FirstSeenTimestampUTC],
                  0
                );
                tag.firstSeenTimestampUTC = firstSeenTimestampUTCus.toNumber(
                  true
                ); // microseconds
              }

              if (subParameters[ParameterConstants.LastSeenTimestampUTC]) {
                // Note: Here is losing precision because JS numbers are defined to be double floats
                const lastSeenTimestampUTCus: Int64 = new Int64(
                  subParameters[ParameterConstants.LastSeenTimestampUTC],
                  0
                );
                tag.lastSeenTimestampUTC = lastSeenTimestampUTCus.toNumber(
                  true
                ); // microseconds
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
                  this.emit(RfidReaderEvent.DidSeeTag, tag);
                });
              }
            }
          }
        );
      }
    });
  }

  private sendMessage(client: net.Socket, buffer: Buffer): void {
    if (!client || (client && client.destroyed)) {
      return;
    }

    process.nextTick(() => {
      console.log(`Sending ${this.getMessageName(buffer)}`);
      this.client.write(buffer);
    });
  }

  private getMessageName(data: Buffer): string {
    // get the message code
    // get the name from the constants.
    return MessagesType[this.getMessage(data)];
  }

  private getMessage(data: Buffer): number {
    // message type resides on the first 2 bits of the first octet
    // and 8 bits of the second octet.
    return ((data[0] & 3) << 8) | data[1];
  }
}
