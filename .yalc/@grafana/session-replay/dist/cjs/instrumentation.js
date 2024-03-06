"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionReplayInstrumentation = void 0;
var rrweb_1 = require("rrweb");
var faro_core_1 = require("@grafana/faro-core");
/**
 * Instrumentation for Performance Timeline API
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceTimeline
 *
 * !!! This instrumentation is in experimental state and it's not meant to be used in production yet. !!!
 * !!! If you want to use it, do it at your own risk. !!!
 */
var SessionReplayInstrumentation = /** @class */ (function (_super) {
    __extends(SessionReplayInstrumentation, _super);
    function SessionReplayInstrumentation() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.name = '@grafana/faro-web-sdk:session-replay';
        _this.version = faro_core_1.VERSION;
        return _this;
    }
    SessionReplayInstrumentation.prototype.initialize = function () {
        this.stopFn = (0, rrweb_1.record)({
            emit: function (event) {
                var _a, _b;
                faro_core_1.faro.api.pushEvent('replay_event', {
                    "timestamp": event.timestamp.toString(),
                    "delay": (_b = (_a = event.delay) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : "",
                    "type": event.type.toString(),
                    "data": JSON.stringify(event.data),
                });
            },
        });
    };
    SessionReplayInstrumentation.prototype.destroy = function () {
        this.stopFn();
    };
    return SessionReplayInstrumentation;
}(faro_core_1.BaseInstrumentation));
exports.SessionReplayInstrumentation = SessionReplayInstrumentation;
//# sourceMappingURL=instrumentation.js.map