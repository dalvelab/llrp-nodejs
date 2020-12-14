"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeParameter = exports.decodeMessage = void 0;
const parameterConstants_1 = __importDefault(require("../constants/parameterConstants"));
const decodeMessage = function (buffer, returnObject = []) {
    // if we have an empty Buffer object.
    if (buffer.length === 0) {
        // end the recursion.
        return [];
    }
    // set variables
    const length = buffer.readUInt32BE(2); // length would be read from the 3rd octet, 4 octets.
    // add to our returnObject our LLRPMessage key value pair.
    returnObject.push({
        length,
        type: ((buffer[0] & 3) << 8) | buffer[1],
        id: buffer.readUInt32BE(6),
        parameter: buffer.slice(10, length),
    });
    // check if there are still parameters following this parameter.
    // if none, undefined will be returned and will not reach the step
    // of getting added to the returnObject.
    exports.decodeMessage(buffer.slice(length), returnObject);
    return returnObject;
};
exports.decodeMessage = decodeMessage;
const decodeParameter = (buffer, returnObject = []) => {
    // if we have an empty Buffer object.
    if (buffer.length === 0) {
        return [];
    }
    // set variables.
    let type;
    let length = 0;
    let value;
    let subParameters;
    let reserved = 0;
    // if is TV-encoded (starts with first bit set as 1)
    if (buffer[0] & 128) {
        type = buffer[0] & 127; // type is the first 7 bits of the first octet.
        length = parameterConstants_1.default.tvLengths[type]; // each TV has a defined length, we reference in our parameter constant.
        // since it is not present in a TV encoded buffer.
        value = buffer.slice(1, length); // the value in a TV starts from the second octet up the entire length of the buffer.
        reserved = 1; // reserved is set as 1 on the first octet's most significant bit.
    }
    else {
        type = ((buffer[0] & 3) << 8) | buffer[1]; // type is the first 2 bits of the first octet and the second octet.
        length = buffer.readUInt16BE(2); // each TLV has length in the third and fourth octet.
        value = buffer.slice(4, length); // the value in a TLV starts from the fifth octet up the entire length of the buffer.
    }
    // see if our parameter constant lists this buffer as having subParameters
    if (parameterConstants_1.default.hasSubParameters[type]) {
        // check for subParameter via recursion.
        // undefined will be returned if none is found.
        subParameters = exports.decodeParameter(value.slice(parameterConstants_1.default.staticLengths[type] - (length - value.length)));
    }
    // add to our returnObject our LLRPParameter key value pair.
    returnObject.push({
        type,
        length,
        value,
        reserved,
        subParameters,
        typeName: parameterConstants_1.default[type],
    });
    // check if there are still parameters following this parameter.
    // if none, undefined will be returned and will not reach the step
    // of getting added to the returnObject.
    exports.decodeParameter(buffer.slice(length), returnObject);
    return returnObject;
};
exports.decodeParameter = decodeParameter;
