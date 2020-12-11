/* 
  This file is responsible for processing messages from reader 
*/

import { messagesType } from "./constants/messagesConstants.js";

export const getLLRPMessage = (message) => {
  return message;
};

export const getMessageName = (message) => {
  // Define message type outside the
  let messageName;
  const messageType = message.type;
  messagesType.map((message) => {
    if (message.type === messageType) {
      messageName = message.name;
    }
  });
  return messageName;
};
