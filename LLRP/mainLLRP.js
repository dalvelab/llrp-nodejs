/*
  This file is responsible for all functions that gonna be executed on TCP events
  Also it sends and receives messages and parameters from reader  
*/
import net from "net";

import { handleReaderData } from "./actions/readerActions.js";

const socket = new net.Socket();
let client = null;

export const LLRPConnection = (config) => {
  let LLRPProps = {
    ipaddress: config.IP_ADDRESS,
    port: config.PORT,
  };
  // Connect to Reader
  const handleConnection = () => {
    client = socket.connect(LLRPProps.port, LLRPProps.ipaddress, function () {
      console.log(`Reader ${config.IP_ADDRESS} is connected`);
    });
  };
  // Get data from Reader
  const handleData = () => {
    client.on("data", (data) => {
      handleReaderData(data, LLRPProps);
    });
  };
  // Close connection with Reader
  const handleClose = () => {
    client.on("close", function () {
      console.log("Connection closed");
    });
  };
  // Destroy connection with Reader (when finish process in cli)
  const handleDestroy = () => {
    client.destroy();
  };

  return {
    LLRPProps,
    handleConnection,
    handleData,
    handleClose,
    handleDestroy,
  };
};
