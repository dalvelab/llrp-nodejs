/*
  This file is reponsible for decoding reader's messages and parameters
*/

import parameterConstants from "./constants/parameterConstants.js";

export const decodeMessage = (buffer, returnObject = []) => {
  // Check if buffer is empty
  if (buffer.length === 0) {
    return undefined;
  }

  // Set length as separate variable cause it is used in parameter further
  const length = buffer.readUInt32BE(2);

  returnObject.push({
    length,
    type: buffer[1],
    id: buffer.readUInt32BE(6),
    parameter: buffer.slice(10, length),
  });

  return returnObject;
};

export const decodeParameter = (buffer, returnObject = []) => {
  if (buffer.length === 0) {
    return undefined;
  }

  let type = null;
  let length = 0;
  let value = null;
  let subParameters = null;
  let reserved = 0;

  if (buffer[0] & 128) {
    type = buffer[0] & 127;
    length = parameterConstants.tvLengths[type];
    value = buffer.slice(1, length);
    reserved = 1;
  } else {
    type = ((buffer[0] & 3) << 8) | buffer[1];
    length = buffer.readUInt16BE(2);
    value = buffer.slice(4, length);
  }

  // see if our parameter constant lists this buffer as having subParameters
  if (parameterConstants.hasSubParameters[type]) {
    // check for subParameter via recursion.
    // undefined will be returned if none is found.
    subParameters = decodeParameter(
      value.slice(
        parameterConstants.staticLengths[type] - (length - value.length)
      )
    );
  }

  // add to our returnObject our LLRPParameter key value pair.
  returnObject.push({
    type,
    length,
    value,
    reserved,
    subParameters,
    name: parameterConstants[type],
  });

  return returnObject;
};
