import ParameterConstants from "../constants/parameterConstants";

import {
  ObjectMessageElement,
  ObjectParameterElement,
} from "../interfaces/decodeInterface";

export const decodeMessage: Function = function (
  buffer: Buffer,
  returnObject: ObjectMessageElement[] = []
): ObjectMessageElement[] {
  // if we have an empty Buffer object.
  if (buffer.length === 0) {
    // end the recursion.
    return [];
  }

  // set variables
  const length: number = buffer.readUInt32BE(2); // length would be read from the 3rd octet, 4 octets.

  // add to our returnObject our LLRPMessage key value pair.
  returnObject.push({
    length, // total length of message in octets.
    type: ((buffer[0] & 3) << 8) | buffer[1], // type is the first 2 bits of the first octet and the second octet.
    id: buffer.readUInt32BE(6), // id would be read from the 7th octet, 4 octets.
    parameter: buffer.slice(10, length), // the parameter value would be starting from 11 up to the end of the curernt message.
  });

  // check if there are still parameters following this parameter.
  // if none, undefined will be returned and will not reach the step
  // of getting added to the returnObject.
  decodeMessage(buffer.slice(length), returnObject);

  return returnObject;
};

export const decodeParameter: Function = (
  buffer: Buffer,
  returnObject: ObjectParameterElement[] = []
): ObjectParameterElement[] => {
  // if we have an empty Buffer object.
  if (buffer.length === 0) {
    return [];
  }

  // set variables.
  let type: number;
  let length: number = 0;
  let value: Buffer;
  let subParameters: any;
  let reserved: number = 0;

  // if is TV-encoded (starts with first bit set as 1)
  if (buffer[0] & 128) {
    type = buffer[0] & 127; // type is the first 7 bits of the first octet.
    length = ParameterConstants.tvLengths[type]; // each TV has a defined length, we reference in our parameter constant.
    // since it is not present in a TV encoded buffer.
    value = buffer.slice(1, length); // the value in a TV starts from the second octet up the entire length of the buffer.
    reserved = 1; // reserved is set as 1 on the first octet's most significant bit.
  } else {
    type = ((buffer[0] & 3) << 8) | buffer[1]; // type is the first 2 bits of the first octet and the second octet.
    length = buffer.readUInt16BE(2); // each TLV has length in the third and fourth octet.
    value = buffer.slice(4, length); // the value in a TLV starts from the fifth octet up the entire length of the buffer.
  }

  // see if our parameter constant lists this buffer as having subParameters
  if (ParameterConstants.hasSubParameters[type]) {
    // check for subParameter via recursion.
    // undefined will be returned if none is found.
    subParameters = decodeParameter(
      value.slice(
        ParameterConstants.staticLengths[type] - (length - value.length)
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
    typeName: ParameterConstants[type],
  });

  // check if there are still parameters following this parameter.
  // if none, undefined will be returned and will not reach the step
  // of getting added to the returnObject.
  decodeParameter(buffer.slice(length), returnObject);

  return returnObject;
};
