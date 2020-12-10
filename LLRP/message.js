/* 
  This file is responsible for processing messages from reader 
*/

import { messagesType } from "./constants/messagesConstants.js";

export const getLLRPMessage = (message) => {
  return message;
};

export const getMessageName = (message) => {
  // Define message type outside the
  const messageType = message.type;
  return messagesType.map((message) => {
    if (message.type === messageType) {
      return message.name;
    }
  });
};
