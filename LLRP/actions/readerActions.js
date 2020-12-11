/* 
  This file is reponsible for handling reader actions
*/
import parameterConstants from "../constants/parameterConstants.js";
import { getLLRPMessage, getMessageName } from "../message.js";
import { decodeMessage, decodeParameter } from "../decoder.js";

// Main function that handles and processes TCP data
export const handleReaderData = (data, LLRPProps) => {
  if (!data) {
    console.log("No data returned by reader");
  }

  const messagesKeyValue = decodeMessage(data);

  for (const index in messagesKeyValue) {
    const message = getLLRPMessage(messagesKeyValue[index]);

    console.log(`Receiving: ${getMessageName(message)}`);

    switch (getMessageName(message)) {
      case "READER_EVENT_NOTIFICATION":
        handleReaderNotification(message);
        break;
      default:
        console.log(`Default case called: ${getMessageName(message)}`);
    }
  }
};

// Supported functions for sending and receiving messages/parameters

// Executes when case is READER_EVENT_NOTIFICATION
const handleReaderNotification = (message) => {
  const parameterKeyValue = decodeParameter(message.parameter);

  parameterKeyValue.forEach((decodeParameters) => {
    if (decodeParameters.name === "ReaderEventNotificationData") {
      const subParameters = decodeParameters.subParameters;
      subParameters.map((parameter) => {
        if (parameter.name === "ROSpecEvent") {
          if (parameter.readUInt(8) === 1) {
            console.log("Reset is start ROSpec Sent");
          }
        }
      });
    }
  });
};
