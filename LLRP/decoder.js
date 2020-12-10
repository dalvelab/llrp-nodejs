/*
  This file is reponsible for decoding reader's messages and parameters
*/

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
