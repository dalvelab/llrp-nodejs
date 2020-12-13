/*
  This file is responsible for all functions that gonna be executed on TCP events
  Also it sends and receives messages and parameters from reader  
*/
import * as net from "net";
import { EventEmitter } from "events";

// LLRP Message Class
import { LLRPMessage } from "./messageLLRP";

// Decoders
import { decodeMessage, decodeParameter } from "./actions/decode";

// Constants
import ParameterConstants from "./constants/parameterConstants";

// Interfaces
import {
  LLRPReader,
  ReaderConfig,
  RfidReaderEvent,
} from "./interfaces/llrpInterface";

import {
  ObjectMessageElement,
  ObjectParameterElement,
} from "./interfaces/decodeInterface";
import { LlrpMessage } from "./interfaces/llrpMessageInterface";
import { MessagesType } from "./interfaces/messagesTypesInterface";

const defaultROSpec: number = 1;

export class LLRPConnection extends EventEmitter implements LLRPReader {
  private ipaddress: string;
  private port: number = 5084;
  private enableTransmitter: boolean = true;

  private socket: net.Socket = new net.Socket();
  private client: any = null;
  public connected: boolean = false;

  constructor(config: ReaderConfig) {
    super();

    this.ipaddress = config.ipaddress;
    this.port = config.port || this.port;
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
        this.emit(
          RfidReaderEvent.Disconnect,
          new Error("Client disconnected.")
        );
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
    // this.sendMessage(this.client, GetLlrpMessage.deleteRoSpec(defaultRoSpecId));
    // this.resetIsStartROSpecSent();
    console.log("Sending: deleteRoSpec");
    console.log("resetIsStartROSpecSent");
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
      this.client.write(GetLlrpMessage.resetConfigurationToFactoryDefaults());
      this.isReaderConfigReset = true; // we have reset the reader configuration.
    } else {
      this.sendStartROSpec();
    }
  }
}
