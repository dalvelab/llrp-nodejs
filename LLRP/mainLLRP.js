/*
  This file is responsible for all functions that gonna be executed on TCP events
  Also it sends and receives messages and parameters from reader  
*/

import { messagesType } from "./constants/messagesConstants.js";
import { decodeMessage } from "./decoder.js";
import { getLLRPMessage, getMessageName } from "./message.js";

export const handleReaderData = (data) => {
  if (!data) {
    console.log("No data returned by reader");
  }

  const messagesKeyValue = decodeMessage(data);

  for (const index in messagesKeyValue) {
    const message = getLLRPMessage(messagesKeyValue[index]);

    console.log(`Receiving: ${getMessageName(message)}`);

    switch (getMessageName(message)) {
      case "READER_EVENT_NOTIFICATION":
        console.log("This is the case");
        break;
      default:
        console.log(`Default case called: ${getMessageName(message)}`);
    }
  }
};
