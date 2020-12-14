"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RfidReaderEvent = void 0;
var RfidReaderEvent;
(function (RfidReaderEvent) {
    RfidReaderEvent["Timeout"] = "timeout";
    RfidReaderEvent["Connected"] = "connected";
    RfidReaderEvent["Disconnect"] = "disconnect";
    RfidReaderEvent["Error"] = "error";
    RfidReaderEvent["DisabledRadioOperation"] = "disabledRadioOperation";
    RfidReaderEvent["StartedRadioOperation"] = "startedRadioOperation";
    RfidReaderEvent["LlrpError"] = "llrpError";
    RfidReaderEvent["DidSeeTag"] = "didSeeTag";
})(RfidReaderEvent = exports.RfidReaderEvent || (exports.RfidReaderEvent = {}));
