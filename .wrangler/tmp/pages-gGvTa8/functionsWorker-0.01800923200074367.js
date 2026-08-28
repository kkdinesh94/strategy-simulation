var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// C:/Users/Admin/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// C:/Users/Admin/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// C:/Users/Admin/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// C:/Users/Admin/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// C:/Users/Admin/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// C:/Users/Admin/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// C:/Users/Admin/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// C:/Users/Admin/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// C:/Users/Admin/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// C:/Users/Admin/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// C:/Users/Admin/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// C:/Users/Admin/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// C:/Users/Admin/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// C:/Users/Admin/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// C:/Users/Admin/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// C:/Users/Admin/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// ../src/lib/competitiveBenchmark.ts
var COMPETITIVE_BENCHMARK_REGION_COST = 15;
var tierFor = /* @__PURE__ */ __name((value) => {
  const id = String(value || "").toUpperCase();
  if (/1|STANDARD|BASIC|ENTRY/.test(id)) return "Entry";
  if (/2|3|MID|ENHANCED|PREMIUM/.test(id)) return "Mid";
  if (/4|5|10|ADVANCED|ULTRA|LONG/.test(id)) return "Premium";
  return value ? "Configured" : "Not disclosed";
}, "tierFor");
var claimsFor = /* @__PURE__ */ __name((team) => (Array.isArray(team?.dec?.claims) ? team.dec.claims : []).slice(0, 2), "claimsFor");
var placementsFor = /* @__PURE__ */ __name((team) => {
  const placements = team?.draft?.mediaPlacements;
  return Array.isArray(placements) && placements.length ? placements : [];
}, "placementsFor");
function buildCompetitiveBenchmark(state, quarter, region) {
  const teams = Array.isArray(state?.teams) ? state.teams : [];
  const segments = [
    { id: "urban_commuter", name: "Urban Commuter", pct: 30 },
    { id: "fleet_operator", name: "Fleet Operator", pct: 25 },
    { id: "performance_enthusiast", name: "Performance Enthusiast", pct: 15 },
    { id: "tech_pioneer", name: "Tech Pioneer", pct: 15 },
    { id: "eco_advocate", name: "Eco Advocate", pct: 15 }
  ];
  const competitors = teams.map((team) => {
    const result = (team.hist || []).find((item) => Number(item.q) === quarter) || (team.hist || []).slice(-1)[0] || {};
    const modelRows = Array.isArray(result.modelRows) ? result.modelRows : [];
    const totalSales = modelRows.reduce((sum, model) => sum + Number(model.units || 0), 0);
    const shortfall = Math.max(0, Number(result.lost || 0));
    const segmentSales = segments.map((segment) => {
      const units = modelRows.reduce((sum, model) => sum + Number(model.segSales?.[segment.id] || 0), 0);
      const weight = totalSales > 0 ? units / totalSales : segment.pct / 100;
      return { segmentId: segment.id, segmentName: segment.name, unitsDemanded: Math.round(units + shortfall * weight) };
    });
    const models = (Array.isArray(team.models) ? team.models : []).map((model, index) => ({
      name: model.name || `Brand ${index + 1}`,
      price: Number(model.price || 0),
      components: Object.entries(model.cfg || {}).map(([category, value]) => ({ category, tier: tierFor(value) })),
      brandJudgment: Math.round(Number(result.judg?.[team.prim]?.p || result.brandJ || 0))
    }));
    const placements = placementsFor(team);
    const media = Object.entries(placements.reduce((counts, placement) => {
      const type = String(placement.mediaType || "Unspecified");
      counts[type] = (counts[type] || 0) + Math.max(0, Number(placement.insertions || 0));
      return counts;
    }, {})).map(([mediaType, insertions]) => ({ mediaType, insertions }));
    const people = Math.max(0, Math.round(Number(team.staff || 0)));
    return {
      teamId: String(team.i),
      brand: team.name,
      color: team.color,
      models,
      salesBySegment: segmentSales,
      advertising: { media, insertions: media.reduce((sum, item) => sum + Number(item.insertions), 0), adJudgment: Math.round(Number(result.campJ || 0)), topBenefitClaims: claimsFor(team) },
      salesForce: { peoplePerOffice: team.centres ? Math.round(people / team.centres * 10) / 10 : people, offices: Math.max(0, Math.round(Number(team.centres || 0))), specialisation: [{ segment: team.prim || "Unassigned", people: Math.ceil(people * 0.6) }, { segment: team.sec || "Unassigned", people: Math.floor(people * 0.4) }] }
    };
  });
  const segmentTotals = segments.map((segment) => {
    const entries = competitors.map((competitor) => ({ brand: competitor.brand, color: competitor.color, units: competitor.salesBySegment.find((item) => item.segmentId === segment.id)?.unitsDemanded || 0 }));
    const total = entries.reduce((sum, entry) => sum + entry.units, 0);
    return { segmentId: segment.id, segmentName: segment.name, totalDemand: total, shares: entries.map((entry) => ({ ...entry, share: total ? entry.units / total : 0 })) };
  });
  return { quarter, region, competitors, segmentMarketShares: segmentTotals };
}
__name(buildCompetitiveBenchmark, "buildCompetitiveBenchmark");

// ../src/engine/catalog.ts
var CATALOG = {
  powertrain: {
    label: "Powertrain",
    opts: [
      { id: "PT1", name: "PT1 \xB7 7.0 kW (0-40 in 3.3s)", cost: 19e3 },
      { id: "PT2", name: "PT2 \xB7 5.5 kW (0-30 in 3.3s)", cost: 14500 },
      { id: "PT3", name: "PT3 \xB7 4.2 kW (0-25)", cost: 11e3 },
      { id: "PT4", name: "PT4 \xB7 3.0 kW hub (0-20)", cost: 8e3 }
    ]
  },
  modes: {
    label: "Riding Modes",
    opts: [
      { id: "RM1", name: "Eco only (incl.)", cost: 0 },
      { id: "RM2", name: "+ Ride (needs PT3+)", cost: 1500, req: /* @__PURE__ */ __name((m) => ["PT1", "PT2", "PT3"].includes(m.cfg.powertrain), "req") },
      { id: "RM3", name: "+ Sport (needs PT2+)", cost: 3200, req: /* @__PURE__ */ __name((m) => ["PT1", "PT2"].includes(m.cfg.powertrain), "req") },
      { id: "RM4", name: "+ Warp (needs PT1)", cost: 5500, req: /* @__PURE__ */ __name((m) => m.cfg.powertrain === "PT1", "req") }
    ]
  },
  battery: {
    label: "Battery / Charging",
    opts: [
      { id: "BC1", name: "BC1 \xB7 100 km \xB7 0-80% 60min", cost: 4e4 },
      { id: "BC2", name: "BC2 \xB7 80 km \xB7 0-65% 60min", cost: 34500 },
      { id: "BC3", name: "BC3 \xB7 75 km \xB7 0-50% 60min", cost: 30500 },
      { id: "BC4", name: "BC4 \xB7 65 km LFP \xB7 0-40%", cost: 25500 },
      { id: "BC5", name: "BC5 \xB7 50 km LFP \xB7 0-35%", cost: 19e3 }
    ]
  },
  tech: {
    label: "Connected Tech",
    opts: [
      { id: "CT1", name: "CT1 \xB7 LCD", cost: 1500 },
      { id: "CT2", name: "CT2 \xB7 TFT + Bluetooth", cost: 5e3 },
      { id: "CT3", name: "CT3 \xB7 App + Navigation", cost: 8500 },
      { id: "CT4", name: "CT4 \xB7 Touchscreen 4G OTA", cost: 13e3 }
    ]
  },
  build: {
    label: "Build / Body",
    opts: [
      { id: "BD1", name: "BD1 \xB7 Aluminium + Metal", cost: 1e4 },
      { id: "BD2", name: "BD2 \xB7 Steel + ABS", cost: 6500 },
      { id: "BD3", name: "BD3 \xB7 Tubular + Poly", cost: 4e3 }
    ]
  },
  wheels: {
    label: "Wheels",
    opts: [
      { id: "ALLOY", name: "Alloy", cost: 4200 },
      { id: "SPOKE", name: "Steel Spoke", cost: 2200 }
    ]
  },
  brakes: {
    label: "Brakes",
    opts: [
      { id: "BR1", name: "Dual Disc + CBS", cost: 5800 },
      { id: "BR2", name: "Front Disc + Drum", cost: 3600 },
      { id: "BR3", name: "Drum + Drum", cost: 2e3 }
    ]
  },
  seat: {
    label: "Seat",
    opts: [
      { id: "WIDE", name: "Wide Dual-Density", cost: 2600 },
      { id: "STD", name: "Standard", cost: 1200 }
    ]
  },
  susp: {
    label: "Suspension",
    opts: [
      { id: "SUS1", name: "Telescopic + Adj. Mono", cost: 6500 },
      { id: "SUS2", name: "Telescopic + Twin Rear", cost: 4800 },
      { id: "SUS3", name: "Basic Spring", cost: 2800 }
    ]
  }
};
var ADDONS = [
  { id: "removable", name: "Removable Battery", cost: 3e3, req: /* @__PURE__ */ __name((m) => ["BC3", "BC4", "BC5"].includes(m.cfg.battery), "req") },
  { id: "regen", name: "Regen Braking", cost: 2500, req: /* @__PURE__ */ __name((m) => ["PT1", "PT2"].includes(m.cfg.powertrain), "req") },
  { id: "boot", name: "34L Boot Storage", cost: 1800 },
  { id: "backrest", name: "Pillion Backrest", cost: 900 },
  { id: "colors", name: "Color Pack", cost: 800 },
  { id: "tpms", name: "TPMS (Tire Pressure)", cost: 1500, req: /* @__PURE__ */ __name((m) => ["CT2", "CT3", "CT4"].includes(m.cfg.tech), "req") },
  { id: "sidestand", name: "Side Stand Cutoff", cost: 400 },
  { id: "hillhold", name: "Hill-Hold Assist", cost: 1200, req: /* @__PURE__ */ __name((m) => ["PT1", "PT2"].includes(m.cfg.powertrain), "req") },
  { id: "reverse", name: "Reverse Assist", cost: 1e3, req: /* @__PURE__ */ __name((m) => ["PT1", "PT2"].includes(m.cfg.powertrain), "req") },
  { id: "theft", name: "Anti-Theft Alerts", cost: 800, req: /* @__PURE__ */ __name((m) => ["CT3", "CT4"].includes(m.cfg.tech), "req") },
  { id: "extwarranty", name: "5-Yr Extended Warranty", cost: 2e3 }
];
var TECHS = [
  { id: "T1", name: "HyperCharge Platform (0-80% in 18 min)", fx: { charge: 2 }, fast: 230, std: 160, note: "Transforms charging anxiety. Strongest with Urban Tech and Fleet." },
  { id: "T2", name: "Solid-State Range Pack (+30% real range)", fx: { range: 2 }, fast: 270, std: 190, note: "Range leadership. Commuters and Fleet value it most." },
  { id: "T3", name: "AI Battery Management Suite", fx: { econ: 1.5, range: 0.5 }, fast: 170, std: 120, note: "Cuts cost/km and degradation. Eco and Fleet friendly." },
  { id: "T4", name: "Swappable-Pack Standard", fx: { charge: 1.5, econ: 0.5 }, fast: 190, std: 135, note: "Charging time becomes a swap. Fleet duty cycles love it." },
  { id: "T5", name: "ADAS-Lite Safety Suite", fx: { safety: 2 }, fast: 210, std: 145, note: "Segment-first safety story. Commuter households respond." },
  { id: "T6", name: "Lightweight Composite Chassis", fx: { perf: 1, range: 1 }, fast: 200, std: 140, note: "Performance and efficiency together. Urban Tech and Young Adults." }
];
var techById = /* @__PURE__ */ __name((id) => TECHS.find((x) => x.id === id), "techById");
var SEGMENTS = [
  { id: "S1", name: "Urban Tech", pct: 0.15, wtp: [125e3, 19e4], theta: 0.6, kappa: 0.6, w: { perf: 20, range: 12, charge: 13, tech: 25, build: 15, comfort: 6, safety: 6, econ: 3 } },
  { id: "S2", name: "Commuters", pct: 0.38, wtp: [9e4, 13e4], theta: 1.2, kappa: 0.9, w: { perf: 6, range: 22, charge: 12, tech: 5, build: 8, comfort: 18, safety: 12, econ: 17 } },
  { id: "S3", name: "Eco", pct: 0.14, wtp: [1e5, 16e4], theta: 0.9, kappa: 0.8, w: { perf: 6, range: 20, charge: 8, tech: 10, build: 18, comfort: 8, safety: 10, econ: 20 } },
  { id: "S4", name: "Young Adults", pct: 0.22, wtp: [6e4, 9e4], theta: 1.4, kappa: 1.3, w: { perf: 22, range: 10, charge: 8, tech: 18, build: 20, comfort: 6, safety: 6, econ: 10 } },
  { id: "S5", name: "Fleet", pct: 0.11, wtp: [7e4, 1e5], theta: 1.3, kappa: 0.7, w: { perf: 4, range: 20, charge: 16, tech: 10, build: 10, comfort: 8, safety: 12, econ: 20 } }
];
var CLAIMS = {
  perf: "Performance & Top Speed",
  range: "Headline Range & Efficiency",
  charge: "Fast & Convenient Charging",
  tech: "Smart Tech & Connectivity",
  build: "Premium Build & Design",
  comfort: "Pillion & Long-Distance Comfort",
  safety: "Safety & Braking Control",
  econ: "Total Cost of Ownership / Economy"
};
var CLAIMS_CATALOG = Object.entries(CLAIMS).map(([id, title2]) => ({ id, title: title2 }));
var BASE_PLATFORM = 14e3;
var ASSEMBLY = 4e3;
var HR = { salesCost: 3.5, plantRate: 0.012, min: 80, max: 130 };
var CENTRE = { open: 40, opex: 8 };
var CAP_BLOCK = { units: 500, cost: 120 };
var DEP_RATE = 0.04;
var HOLD_COST = 0.015;

// ../src/engine/simulationEngine.ts
var clamp = /* @__PURE__ */ __name((v, a, b) => Math.max(a, Math.min(b, v)), "clamp");
var clamp10 = /* @__PURE__ */ __name((v) => clamp(v, 0, 10), "clamp10");
function scoreModel(m, t) {
  const c = m.cfg;
  const ad = m.add;
  const isLFP = ["BC4", "BC5"].includes(c.battery);
  const a = {};
  const ptScore = { PT1: 8, PT2: 6.5, PT3: 5, PT4: 3 }[c.powertrain] || 5;
  const modeScore = { RM1: 0, RM2: 0.5, RM3: 1.2, RM4: 2 }[c.modes] || 0;
  a.perf = clamp10(ptScore + modeScore);
  const batRange = { BC1: 10, BC2: 8, BC3: 7.5, BC4: 6.5, BC5: 4.5 }[c.battery] || 5;
  a.range = clamp10(batRange + (ad.regen ? 0.5 : 0));
  const batCharge = { BC1: 10, BC2: 7.5, BC3: 6, BC4: 5, BC5: 4 }[c.battery] || 5;
  a.charge = clamp10(batCharge + (ad.removable ? 2 : 0));
  const techScore = { CT1: 1.5, CT2: 5, CT3: 7.5, CT4: 10 }[c.tech] || 5;
  a.tech = clamp10(techScore + (ad.theft ? 0.5 : 0));
  const buildScore = { BD1: 9, BD2: 6, BD3: 3.5 }[c.build] || 5;
  a.build = clamp10(buildScore + (c.wheels === "ALLOY" ? 1 : 0) + (ad.colors ? 0.5 : 0));
  const seatScore = { WIDE: 3, STD: 1.5 }[c.seat] || 2;
  const suspScore = { SUS1: 5.5, SUS2: 4, SUS3: 2 }[c.susp] || 3;
  a.comfort = clamp10(
    seatScore + suspScore + (ad.boot ? 1 : 0) + (ad.backrest ? 0.5 : 0) + (ad.hillhold ? 0.3 : 0) + (ad.reverse ? 0.3 : 0)
  );
  const brakeScore = { BR1: 6.5, BR2: 4.5, BR3: 2.5 }[c.brakes] || 3;
  a.safety = clamp10(
    brakeScore + (ad.tpms ? 1 : 0) + (ad.sidestand ? 0.5 : 0) + (ad.hillhold ? 1 : 0) + (ad.theft ? 0.5 : 0) + (ad.regen ? 0.5 : 0)
  );
  a.econ = clamp10(
    4 + (isLFP ? 1.5 : 0) + (c.powertrain === "PT4" ? 1 : 0) + (c.build === "BD1" ? 1 : 0) + (c.build === "BD3" ? -1 : 0) + (ad.extwarranty ? 2 : 0) + (ad.removable ? 0.5 : 0)
  );
  const activeTechIds = m.equippedTechs ? m.equippedTechs.filter((id) => t?.techs?.includes(id)) : t?.techs || [];
  if (activeTechIds.length) {
    for (const id of activeTechIds) {
      const tc = techById(id);
      if (!tc) continue;
      for (const k of Object.keys(tc.fx)) {
        a[k] = clamp10((a[k] || 0) + (tc.fx[k] || 0));
      }
    }
  }
  if (t) {
    a.econ = clamp10(a.econ + 3 * (reliabilityOf(t) - 0.5));
  }
  a.build_eco = clamp10(
    ({ BD1: 9, BD2: 5, BD3: 2.5 }[c.build] || 5) + (isLFP ? 1 : 0) + (ad.regen ? 0.5 : 0) + (ad.extwarranty ? 1 : 0)
  );
  a.build_style = clamp10(a.build + (ad.colors ? 1 : 0));
  return a;
}
__name(scoreModel, "scoreModel");
function qualityFit(a, seg) {
  let q = 0;
  for (const k of Object.keys(seg.w)) {
    let x = a[k] || 0;
    if (k === "build" && seg.id === "S3") x = a.build_eco || x;
    if (k === "build" && seg.id === "S4") x = a.build_style || x;
    q += seg.w[k] * (x / 10);
  }
  return q / 100;
}
__name(qualityFit, "qualityFit");
function priceFit(p, seg) {
  const [L, H] = seg.wtp;
  if (p <= L) return 1;
  if (p <= H) return Math.pow((H - p) / (H - L), seg.theta);
  return 0.08 * Math.exp(-(p - H) / (0.1 * H));
}
__name(priceFit, "priceFit");
function unitCost(m) {
  let c = BASE_PLATFORM;
  for (const cat of Object.keys(CATALOG)) {
    const opt = CATALOG[cat].opts.find((o) => o.id === m.cfg[cat]);
    if (opt) c += opt.cost;
  }
  for (const a of ADDONS) {
    if (m.add[a.id]) c += a.cost;
  }
  return c + ASSEMBLY;
}
__name(unitCost, "unitCost");
function bomHash(m) {
  return Object.values(m.cfg).join("|") + "|" + ADDONS.map((a) => m.add[a.id] ? 1 : 0).join("");
}
__name(bomHash, "bomHash");
function reliabilityOf(t) {
  const spendReliability = 1 - 0.5 * Math.exp(-t.qualityCum / 150);
  const components = t.qualityComponents;
  if (!components || components.length === 0) return spendReliability;
  const componentReliability = components.reduce(
    (total, component) => total + 0.5 + Math.min(0.5, Math.max(0, component.reliabilityImprovement) / 100),
    0
  ) / components.length;
  return Math.max(0, Math.min(1, (spendReliability + componentReliability) / 2));
}
__name(reliabilityOf, "reliabilityOf");
function equityOf(t) {
  return t.paidIn + t.cumProfit;
}
__name(equityOf, "equityOf");
function debtOf(t) {
  return t.debt.bank + t.debt.lt + t.debt.shark;
}
__name(debtOf, "debtOf");
function bankLimit(t) {
  return Math.max(0, 1.5 * equityOf(t) - t.debt.lt - t.debt.shark);
}
__name(bankLimit, "bankLimit");
function ltLimit(t) {
  return Math.max(0, 2 * equityOf(t) - debtOf(t));
}
__name(ltLimit, "ltLimit");
function sharesOf(t) {
  return t.shares || 100;
}
__name(sharesOf, "sharesOf");
function stockPriceOf(t) {
  if (t.stockPrice && t.stockPrice > 0) return t.stockPrice;
  const val = valuationOf(t);
  const sh = sharesOf(t);
  return Math.max(0.5, Math.round(val / sh * 100) / 100);
}
__name(stockPriceOf, "stockPriceOf");
function marketCapOf(t) {
  return Math.round(sharesOf(t) * stockPriceOf(t) * 10) / 10;
}
__name(marketCapOf, "marketCapOf");
function maxShareIssueLimit(t) {
  const currentCap = marketCapOf(t);
  return Math.max(100, Math.min(800, Math.round(currentCap * 0.35)));
}
__name(maxShareIssueLimit, "maxShareIssueLimit");
function maxShareBuybackLimit(t) {
  const sh = sharesOf(t);
  if (sh <= 25 || t.cash <= 50) return 0;
  const p = stockPriceOf(t);
  const maxSharesToBuy = sh - 25;
  return Math.max(0, Math.min(Math.round(t.cash * 0.6), Math.round(maxSharesToBuy * p)));
}
__name(maxShareBuybackLimit, "maxShareBuybackLimit");
function hrMults(st, t) {
  const defaults = {
    sales: { salary: 3.5, benefits: 8, vacation: 15, bonus: 10 },
    production: { salary: 2.5, benefits: 8, vacation: 18, bonus: 8, safetyBonus: 5 }
  };
  const value = /* @__PURE__ */ __name((pkg, kind) => {
    const safety = kind === "production" ? Number(pkg.safetyBonus || 0) : 0;
    return Number(pkg.salary || 0) * (1 + Number(pkg.benefits || 0) / 100 + Number(pkg.bonus || 0) / 100 + safety / 100) + Number(pkg.vacation || 0) * 0.03;
  }, "value");
  if (t.hrCompensation) {
    const packageFor = /* @__PURE__ */ __name((team, kind) => ({ ...defaults[kind], ...team.hrCompensation?.[kind] || {} }), "packageFor");
    const score = /* @__PURE__ */ __name((kind) => {
      const benchmark = st.teams.reduce((sum, team) => sum + value(packageFor(team, kind), kind), 0) / Math.max(1, st.teams.length);
      return clamp(value(packageFor(t, kind), kind) / Math.max(1e-4, benchmark), 0.75, 1.25);
    }, "score");
    return { sales: score("sales"), plant: score("production") };
  }
  const mean = /* @__PURE__ */ __name((k) => st.teams.reduce((x, x2) => x + x2.hr[k], 0) / (st.teams.length || 1), "mean");
  const f = /* @__PURE__ */ __name((idx, mn) => clamp(1 + 8e-3 * (idx - mn), 0.75, 1.15), "f");
  return { sales: f(t.hr.sales, mean("sales")), plant: f(t.hr.plant, mean("plant")) };
}
__name(hrMults, "hrMults");
function reachOf(t, salesMult) {
  return clamp(1 - Math.exp(-(t.centres * 0.28 + t.staff * (salesMult || 1) * 0.035)), 0.15, 0.97);
}
__name(reachOf, "reachOf");
function futureInvOf(r) {
  return (r.rndSpend || 0) + (r.licPaid || 0) + (r.quality || 0) + (r.centreOpen || 0) + (r.dev || 0) + (r.dep || 0);
}
__name(futureInvOf, "futureInvOf");
function valuationOf(t) {
  const L = Math.min(4, t.hist.length);
  if (L === 0) return 800;
  const annRev = t.hist.slice(-L).reduce((x, r) => x + r.revenue, 0) * (4 / L);
  const bscAvg = cumBSC(t);
  return Math.max(800, Math.round(1.2 * annRev * (0.7 + 0.6 * t.rep) * (1 + 0.15 * Math.min(2, bscAvg))));
}
__name(valuationOf, "valuationOf");
function computeBSC(t, r, _st) {
  const paidCr = Math.max(1, t.paidIn / 100);
  const netOp = r.profit + futureInvOf(r);
  const FP = (r.grossProfit + netOp) / 2 / paidCr / 10;
  const shares = [r.sharePrim, r.shareSec];
  const served = r.demandTot > 0 ? clamp((r.demandTot - r.lost) / r.demandTot, 0, 1) : 1;
  const MP = (shares[0] + shares[1]) / 2 * served;
  const ME = clamp((r.brandJ + r.campJ) / 2 / 100, 0, 1);
  const IF = clamp(1 + 10 * (t.cumFuture / Math.max(1, t.cumRevenue)), 1, 5);
  const stockRatio = stockPriceOf(t) / 8;
  const divRatio = (t.cumDividends || 0) / Math.max(1, t.paidIn);
  const W = clamp(equityOf(t) / Math.max(1, t.paidIn) * 0.45 + stockRatio * 0.35 + divRatio * 0.6, 0.1, 4.5);
  const hr = r.hrM ? clamp(((r.hrM.sales - 0.75) / 0.4 + (r.hrM.plant - 0.75) / 0.4) / 2, 0, 1) : 0.6;
  const assets = Math.max(1, t.cash + r.invValue + t.ppe);
  const turn = clamp(r.revenue / assets * 4, 0, 3) / 3;
  const invPen = r.produced > 0 ? Math.max(0, 1 - r.endInv / r.produced) : 1;
  const AM = turn * invPen;
  const MFG = r.reliab * clamp(r.util, 0, 1);
  const cap = equityOf(t) + debtOf(t);
  const FR = cap > 0 && equityOf(t) > 0 ? Math.sqrt(equityOf(t) / cap) : 0;
  const parts = { FP: Math.max(0, FP), MP, ME, IF, W, HR: hr, AM, MFG, FR };
  if (r.sustainabilityScore !== void 0) parts.ESG = clamp(1 + r.sustainabilityScore / 100, 0.8, 1.1);
  let total = 100;
  for (const k of Object.keys(parts)) total *= parts[k];
  return { parts, total: Math.max(0, total) };
}
__name(computeBSC, "computeBSC");
function cumBSC(t) {
  const L = Math.min(4, t.hist.length);
  if (L === 0) return 0;
  return t.hist.slice(-L).reduce((x, r) => x + (r.bsc ? r.bsc.total : 0), 0) / L;
}
__name(cumBSC, "cumBSC");
function seasonOf(q) {
  const p = (q - 1) % 4;
  return p === 1 ? { f: 0.9, label: "Monsoon quarter \xB7 demand x0.9" } : p === 2 ? { f: 1.25, label: "Festive quarter \xB7 demand x1.25" } : { f: 1, label: "Regular quarter" };
}
__name(seasonOf, "seasonOf");
function simulateQuarter(st) {
  const q = st.quarter;
  const season = seasonOf(q);
  const tam = st.cfg.tam0 * Math.pow(1 + st.cfg.growth, q - 1) * season.f;
  const pools = {};
  SEGMENTS.forEach((s) => pools[s.id] = tam * s.pct);
  for (const t of st.teams) {
    t.staff = Math.max(0, t.staff + (t.dec.hire || 0));
    t.centres += t.dec.newCentres || 0;
  }
  for (const t of st.teams) {
    t._hrM = hrMults(st, t);
    t._reach = reachOf(t, t._hrM.sales);
  }
  for (const t of st.teams) {
    const done = t.rnd.filter((p) => p.qDone <= q);
    for (const p of done) if (!t.techs.includes(p.id)) t.techs.push(p.id);
    t.rnd = t.rnd.filter((p) => p.qDone > q);
  }
  const LAMBDA = 2.5, ALPHA = 1.3, RHO = 0.5, OUTSIDE_U = 0.22, AW_DECAY = 0.1, AD_K = 120;
  for (const t of st.teams) {
    t._fit = {};
    for (const s of SEGMENTS) {
      const spend = t.dec.ad * (t.dec.alloc[s.id] || 0) / 100;
      const fit = (t.dec.claims || []).reduce((x, k) => x + (s.w[k] || 0), 0) / 100;
      t._fit[s.id] = fit;
      const adMult = t.dec.claims && t.dec.claims.length ? 0.8 + 0.8 * fit : 0.9;
      const me = Math.min(0.97, adMult * 0.9 * (1 - Math.exp(-spend / AD_K)));
      const wom = s.kappa * Math.min(1, t.base[s.id] / (pools[s.id] * 2 || 1)) * (t.rep - 0.5) * 2;
      let aw = t.aw[s.id];
      aw = aw + (1 - aw) * clamp(me + Math.max(0, wom), 0, 1) - AW_DECAY * aw + Math.min(0, wom) * 0.5;
      t.aw[s.id] = clamp(aw, 0.02, 0.97);
    }
  }
  const cats = Object.keys(CATALOG);
  for (const t of st.teams) {
    const n = t.models.length;
    let ch = 1;
    if (n > 1) {
      let diff = 0, pairs = 0;
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          pairs++;
          diff += cats.filter((c) => t.models[i].cfg[c] !== t.models[j].cfg[c]).length / cats.length;
        }
      ch = 1 - 0.1 * (n - 1) * (0.4 + 0.6 * (diff / (pairs || 1)));
    }
    t._ch = ch;
    const sched = t.models.reduce((x, m) => x + (t.dec.prod[m.id] || 0), 0);
    t._sched = sched;
    t._eff = ch * t._hrM.plant;
    t._chLoss = Math.round(sched * (1 - t._eff));
    t._produced = Math.round(sched * t._eff);
  }
  const offers = [];
  st.teams.forEach(
    (t) => t.models.forEach((m) => {
      const madeThisQ = (t.dec.prod[m.id] || 0) * t._eff;
      offers.push({
        t,
        m,
        scores: scoreModel(m, t),
        cost: unitCost(m),
        orders: {},
        sales: {},
        made: madeThisQ,
        avail: madeThisQ + (m.inv || 0)
      });
    })
  );
  const wBySeg = {};
  for (const s of SEGMENTS) {
    let den = Math.pow(OUTSIDE_U, LAMBDA);
    const ws = [];
    for (const o of offers) {
      const U = Math.pow(qualityFit(o.scores, s), ALPHA) * priceFit(o.m.price, s) * Math.pow(o.t.rep, RHO);
      const w = o.t.aw[s.id] * Math.pow(o.t._reach, 0.8) * Math.pow(U, LAMBDA);
      ws.push(w);
      den += w;
    }
    wBySeg[s.id] = { ws, den };
    offers.forEach((o, i) => {
      o.orders[s.id] = pools[s.id] * ws[i] / den;
    });
  }
  for (const o of offers) {
    const tot = SEGMENTS.reduce((x, s) => x + o.orders[s.id], 0);
    const ratio = tot > 0 ? Math.min(1, o.avail / tot) : 1;
    SEGMENTS.forEach((s) => o.sales[s.id] = o.orders[s.id] * ratio);
    o.remaining = o.avail - SEGMENTS.reduce((x, s) => x + o.sales[s.id], 0);
    o.lost = tot - SEGMENTS.reduce((x, s) => x + o.sales[s.id], 0);
  }
  for (const s of SEGMENTS) {
    const unmet = offers.reduce((x, o) => x + (o.orders[s.id] - o.sales[s.id]), 0) * 0.6;
    if (unmet < 1) continue;
    const cands = offers.filter((o) => o.remaining > 1);
    const wsum = cands.reduce((x, o) => x + wBySeg[s.id].ws[offers.indexOf(o)], 0);
    if (wsum <= 0) continue;
    for (const o of cands) {
      const extra = Math.min(o.remaining, unmet * wBySeg[s.id].ws[offers.indexOf(o)] / wsum);
      o.sales[s.id] += extra;
      o.remaining -= extra;
    }
  }
  const licPaidBy = {};
  const licRecdBy = {};
  for (const c of st.contracts) {
    if (c.status !== "accepted") continue;
    const seller = st.teams[c.sellerI], buyer = st.teams[c.buyerI];
    licPaidBy[buyer.i] = (licPaidBy[buyer.i] || 0) + c.fee;
    licRecdBy[seller.i] = (licRecdBy[seller.i] || 0) + c.fee;
    if (!buyer.techs.includes(c.techId)) buyer.techs.push(c.techId);
    c.status = "executed";
    c.qExecuted = q;
  }
  for (const t of st.teams) {
    const tOffers = offers.filter((o) => o.t === t);
    const invStart = t.models.reduce((x, m) => x + (m.inv || 0) * unitCost(m), 0) / 1e5;
    let units = 0, revenue = 0, cogs = 0, lost = 0, demandTot = 0;
    const modelRows = [];
    for (const o of tOffers) {
      const u = SEGMENTS.reduce((x, s) => x + o.sales[s.id], 0);
      units += u;
      revenue += u * o.m.price / 1e5;
      cogs += u * o.cost / 1e5;
      lost += o.lost;
      demandTot += u + o.lost;
      const segSales = {};
      SEGMENTS.forEach((s) => segSales[s.id] = o.sales[s.id]);
      modelRows.push({ name: o.m.name, price: o.m.price, units: u, segSales, cost: o.cost });
      SEGMENTS.forEach((s) => t.base[s.id] += o.sales[s.id]);
      o.m.inv = Math.max(0, Math.round(o.remaining));
    }
    const endInv = t.models.reduce((x, m) => x + (m.inv || 0), 0);
    const invValue = t.models.reduce((x, m) => x + (m.inv || 0) * unitCost(m), 0) / 1e5;
    const dev = t.dec.devCost || 0;
    const research = (t.dec.buyIntel ? 15 : 0) + (t.dec.buyClinic ? 10 : 0);
    const ad = t.dec.ad;
    const salesPayroll = t.staff * HR.salesCost * (t.hr.sales / 100);
    const plantPayroll = t.capacity * HR.plantRate * (t.hr.plant / 100);
    const netOpex = t.centres * CENTRE.opex;
    const centreOpen = (t.dec.newCentres || 0) * CENTRE.open;
    const fixed = 50 + 0.02 * t.capacity;
    const ga = 30 + 0.02 * revenue;
    const reliab = reliabilityOf(t);
    const warrPerUnit = (2600 - 1800 * reliab) / 1e5;
    const warranty = units * warrPerUnit;
    const quality = t.dec.quality || 0;
    const rndSpend = t.dec.rndStartCost || 0;
    const licPaid = licPaidBy[t.i] || 0, licRecd = licRecdBy[t.i] || 0;
    const holding = endInv * HOLD_COST;
    const dep = DEP_RATE * t.ppe;
    const bankRate = clamp(
      t.dec.interestRate ?? 0.03 + 0.02 * (bankLimit(t) > 0 ? t.debt.bank / Math.max(1, bankLimit(t)) : 0),
      0,
      0.25
    );
    const intBank = t.debt.bank * bankRate;
    const intLT = t.debt.lt * 0.045;
    const sharkRate = t.debt.shark > 0 ? Math.min(0.25, 0.05 + 5e-3 * Math.ceil(t.debt.shark / 100)) : 0;
    const intShark = t.debt.shark * sharkRate;
    const interest = intBank + intLT + intShark;
    const grossProfit = revenue - cogs;
    const ebitda = grossProfit - ad - fixed - ga - warranty - dev - research - salesPayroll - plantPayroll - netOpex - quality - rndSpend - licPaid + licRecd - holding;
    const profit = ebitda - interest - dep - centreOpen;
    const deltaInv = invValue - invStart;
    t.cash += profit + dep - deltaInv;
    t.cumProfit += profit;
    t.cumRevenue += revenue;
    t.qualityCum += quality;
    t.cumFuture += rndSpend + licPaid + quality + centreOpen + dev + dep;
    t.ppe = Math.max(0, t.ppe - dep);
    if (t.dec.ltIssue > 0 && t.debt.lt === 0) {
      const amt = Math.min(t.dec.ltIssue, ltLimit(t));
      if (amt > 0) {
        t.debt.lt = amt;
        t.debt.ltLeft = 20;
        t.cash += amt;
        t._ltIssued = amt;
      }
    }
    const bt = clamp(t.dec.bankTarget || 0, 0, bankLimit(t));
    const dBank = bt - t.debt.bank;
    t.debt.bank = bt;
    t.cash += dBank;
    const cdInvestment = Math.min(Math.max(0, t.dec.cdInvestment || 0), Math.max(0, t.cash));
    if (cdInvestment > 0) {
      const cdInterest = cdInvestment * 0.02;
      t.cash += cdInterest;
      t.cumProfit += cdInterest;
    }
    if (t.debt.lt > 0) {
      t.debt.ltLeft--;
      if (t.debt.ltLeft <= 0) {
        t.cash -= t.debt.lt;
        t._ltRepaid = t.debt.lt;
        t.debt.lt = 0;
      }
    }
    if (t.debt.shark > 0 && t.cash > 0) {
      const pay = Math.min(t.cash, t.debt.shark);
      t.debt.shark -= pay;
      t.cash -= pay;
    }
    const blocks = t.dec.expBlocks || 0;
    let capex = 0;
    if (blocks > 0) {
      capex = blocks * CAP_BLOCK.cost;
      t.cash -= capex;
      t.ppe += capex;
      t._capAdd = blocks * CAP_BLOCK.units;
    }
    let vcDeal = null;
    if (q >= st.cfg.vcQuarter && t.dec.vc && t.dec.vc.ask > 0) {
      const val = valuationOf(t);
      const req = 100 * t.dec.vc.ask / val;
      const offered = clamp(
        t.dec.vc.sharesOffered && t.dec.vc.sharesOffered > 0 ? 100 * t.dec.vc.sharesOffered / Math.max(1, (t.shares || 100) + t.dec.vc.sharesOffered) : t.dec.vc.equity,
        0,
        60
      );
      const funded = offered >= req ? t.dec.vc.ask : Math.round(t.dec.vc.ask * offered / Math.max(req, 0.01));
      if (funded > 0) {
        t.cash += funded;
        t.vcRaised += funded;
        t.paidIn += funded;
        t.equityVC += offered;
      }
      vcDeal = { ask: t.dec.vc.ask, offered, valuation: val, required: req, funded };
    }
    const currentPriceBefore = stockPriceOf(t);
    let shareIssueAmt = 0;
    let newSharesIssued = 0;
    if (t.dec.shareIssue && t.dec.shareIssue > 0) {
      const maxIssue = maxShareIssueLimit(t);
      shareIssueAmt = Math.min(t.dec.shareIssue, maxIssue);
      newSharesIssued = shareIssueAmt / Math.max(0.5, currentPriceBefore);
      t.shares = (t.shares || 100) + newSharesIssued;
      t.paidIn += shareIssueAmt;
      t.cash += shareIssueAmt;
      t._shareIssueAmt = shareIssueAmt;
    }
    let shareBuybackAmt = 0;
    let sharesRepurchased = 0;
    if (t.dec.shareBuyback && t.dec.shareBuyback > 0 && t.cash > 0) {
      const maxBuyback = maxShareBuybackLimit(t);
      shareBuybackAmt = Math.min(t.dec.shareBuyback, Math.min(maxBuyback, t.cash * 0.7));
      if (shareBuybackAmt > 0) {
        sharesRepurchased = shareBuybackAmt / Math.max(0.5, currentPriceBefore);
        t.shares = Math.max(25, (t.shares || 100) - sharesRepurchased);
        t.paidIn = Math.max(100, t.paidIn - shareBuybackAmt);
        t.cash -= shareBuybackAmt;
        t._shareBuybackAmt = shareBuybackAmt;
      }
    }
    let dividendsPaid = 0;
    if (t.dec.dividendPerShare && t.dec.dividendPerShare > 0) {
      const totalDivReq = t.dec.dividendPerShare * (t.shares || 100);
      if (t.cash >= totalDivReq) {
        dividendsPaid = totalDivReq;
        t.cash -= dividendsPaid;
        t.cumDividends = (t.cumDividends || 0) + dividendsPaid;
        t._dividendsPaid = dividendsPaid;
      }
    }
    let sharkNew = 0, dilution = 0;
    if (t.cash < 0) {
      sharkNew = -t.cash;
      t.debt.shark += sharkNew;
      t.cash = 0;
      dilution = Math.min(5, sharkNew / 100 * 0.5);
      t.equityEm = Math.min(30, t.equityEm + dilution);
    }
    const newlyBankrupt = !t.bankrupt && equityOf(t) < 0;
    if (newlyBankrupt) t.bankrupt = true;
    const currentShares = t.shares || 100;
    const eps = profit / currentShares;
    const netEquity = equityOf(t);
    const roe = netEquity > 0 ? profit / netEquity * 100 : 0;
    const newFirmValuation = valuationOf(t);
    const baseStockPrice = newFirmValuation / currentShares;
    const divBoost = dividendsPaid > 0 ? 0.06 : 0;
    const epsBoost = eps > 0 ? Math.min(0.25, eps / 12 * 0.1) : -0.12;
    const repBoost = (t.rep - 0.5) * 0.15;
    const nextStockPrice = Math.max(
      0.5,
      Math.round(baseStockPrice * (1 + divBoost + epsBoost + repBoost) * 100) / 100
    );
    t.stockPrice = nextStockPrice;
    const marketCap = Math.round(currentShares * nextStockPrice * 10) / 10;
    const operatingCash = profit + dep - deltaInv;
    const investingCash = -(capex + dev + rndSpend + centreOpen);
    const financingCash = dBank + (t._ltIssued || 0) - (t._ltRepaid || 0) + shareIssueAmt - shareBuybackAmt - dividendsPaid + (vcDeal ? vcDeal.funded : 0);
    const cashFlow = {
      operating: Math.round(operatingCash * 10) / 10,
      investing: Math.round(investingCash * 10) / 10,
      financing: Math.round(financingCash * 10) / 10,
      net: Math.round((operatingCash + investingCash + financingCash) * 10) / 10
    };
    const balanceSheet = {
      cash: Math.round(t.cash * 10) / 10,
      inventory: Math.round(invValue * 10) / 10,
      ppe: Math.round(t.ppe * 10) / 10,
      totalAssets: Math.round((t.cash + invValue + t.ppe) * 10) / 10,
      shortTermDebt: Math.round(t.debt.bank * 10) / 10,
      longTermDebt: Math.round(t.debt.lt * 10) / 10,
      sharkDebt: Math.round(t.debt.shark * 10) / 10,
      totalLiabilities: Math.round(debtOf(t) * 10) / 10,
      paidInCapital: Math.round(t.paidIn * 10) / 10,
      retainedEarnings: Math.round(t.cumProfit * 10) / 10,
      totalEquity: Math.round(equityOf(t) * 10) / 10
    };
    const wUnits = Math.max(1, units);
    let sat = 0;
    for (const o of tOffers) {
      const u = SEGMENTS.reduce((x, s) => x + o.sales[s.id], 0);
      const sSat = clamp(
        0.45 + 0.03 * o.scores.econ + 0.015 * o.scores.safety + (o.m.add.extwarranty ? 0.05 : 0) - (o.m.cfg.build === "BD3" ? 0.06 : 0),
        0,
        1
      );
      sat += sSat * (u / wUnits);
    }
    if (units === 0) sat = t.rep;
    sat = clamp(sat + 0.06 * (t._reach - 0.7) + 0.08 * (reliab - 0.5), 0, 1);
    let overP = 0;
    for (const k of t.dec.claims || []) {
      const best = Math.max(...tOffers.map((o) => o.scores[k] || 0), 0);
      if (best < 6) overP += 0.04;
    }
    sat = clamp(sat - Math.min(0.08, overP), 0, 1);
    const stockout = lost > units * 0.05 && lost > 10;
    if (stockout) t.rep = clamp(t.rep - 0.03, 0, 1);
    t.rep = clamp(t.rep + 0.3 * (sat - t.rep), 0.1, 0.95);
    const totUnitsMkt = offers.reduce(
      (x, o) => x + SEGMENTS.reduce((y, s) => y + o.sales[s.id], 0),
      0
    );
    const share = totUnitsMkt > 0 ? units / totUnitsMkt : 0;
    const segShareOf = /* @__PURE__ */ __name((sid) => {
      const segTot = offers.reduce((x, o) => x + o.sales[sid], 0);
      const mine = tOffers.reduce((x, o) => x + o.sales[sid], 0);
      return segTot > 0 ? mine / segTot : 0;
    }, "segShareOf");
    const sharePrim = segShareOf(t.prim), shareSec = segShareOf(t.sec);
    const judg = {};
    let brandJ = 0, campJ = 0;
    for (const s of SEGMENTS) {
      let bq = -1, bo = null;
      for (const o of tOffers) {
        const qq = qualityFit(o.scores, s);
        if (qq > bq) {
          bq = qq;
          bo = o;
        }
      }
      judg[s.id] = bo ? {
        p: Math.round(100 * bq),
        pr: Math.round(100 * priceFit(bo.m.price, s)),
        c: t.dec.claims && t.dec.claims.length ? Math.round(100 * Math.min(1, t._fit[s.id] / 0.4)) : 45
      } : { p: 0, pr: 0, c: 0 };
    }
    brandJ = (judg[t.prim].p + judg[t.sec].p) / 2;
    campJ = (judg[t.prim].c + judg[t.sec].c) / 2;
    const util = t.capacity > 0 ? t._produced / t.capacity : 0;
    const res = {
      q,
      units: Math.round(units),
      revenue,
      cogs,
      grossProfit,
      ad,
      fixed,
      ga,
      warranty,
      dev,
      research,
      salesPayroll,
      plantPayroll,
      netOpex,
      centreOpen,
      quality,
      rndSpend,
      licPaid,
      licRecd,
      holding,
      dep,
      intBank,
      intLT,
      intShark,
      interest,
      capex,
      ebitda,
      profit,
      deltaInv,
      cash: t.cash,
      rep: t.rep,
      share,
      sharePrim,
      shareSec,
      demandTot,
      lost: Math.round(lost),
      stockout,
      modelRows,
      awSnap: { ...t.aw },
      judg,
      brandJ,
      campJ,
      chLoss: t._chLoss,
      overP: overP > 0,
      vcDeal,
      dilution,
      sharkNew,
      produced: t._produced,
      endInv,
      invValue,
      util,
      reliab,
      reach: t._reach,
      hrM: t._hrM,
      equity: { f: Math.max(0, 100 - t.equityVC - t.equityEm), vc: t.equityVC, em: t.equityEm },
      debt: { ...t.debt },
      ppe: t.ppe,
      bankrupt: t.bankrupt,
      capAdd: t._capAdd || 0,
      ltIssued: t._ltIssued || 0,
      ltRepaid: t._ltRepaid || 0,
      shares: Math.round(currentShares * 10) / 10,
      stockPrice: nextStockPrice,
      marketCap,
      eps: Math.round(eps * 100) / 100,
      roe: Math.round(roe * 10) / 10,
      dividendsPaid,
      shareIssueAmt,
      shareBuybackAmt,
      cashFlow,
      balanceSheet,
      bsc: { parts: {}, total: 0 }
    };
    res.bsc = computeBSC(t, res, st);
    if (sharkNew > 0) {
      res.bsc.parts.emergencyLoan = -Math.min(0.25, sharkNew / Math.max(1, t.paidIn));
      res.bsc.total = Math.max(0, res.bsc.total + res.bsc.parts.emergencyLoan);
    }
    t.hist.push(res);
    if (t._capAdd) {
      t.capacity += t._capAdd;
    }
    t._capAdd = 0;
    t._ltIssued = 0;
    t._ltRepaid = 0;
    t._shareIssueAmt = 0;
    t._shareBuybackAmt = 0;
    t._dividendsPaid = 0;
    t.dec.devCost = 0;
    t.dec.rndStartCost = 0;
    t.dec.newCentres = 0;
    t.dec.hire = 0;
    t.dec.expBlocks = 0;
    t.dec.ltIssue = 0;
    t.dec.shareIssue = 0;
    t.dec.shareBuyback = 0;
    t.dec.dividendPerShare = 0;
    t.dec.locked = false;
    t.models.forEach((m) => m.lastHash = bomHash(m));
  }
  for (const c of st.contracts) if (c.status === "offered") c.status = "expired";
  for (const t of st.teams) {
    const r = t.hist[t.hist.length - 1];
    if (t.dec.buyIntel) {
      r.intel = st.teams.filter((x) => x !== t).map((x) => ({
        name: x.name,
        color: x.color,
        adBudget: Math.round(x.dec.ad / 25) * 25,
        awAvg: (SEGMENTS.reduce((a, s) => a + x.aw[s.id], 0) / 5).toFixed(2),
        centres: x.centres,
        staff: x.staff,
        techs: x.techs.map((id) => techById(id).name),
        models: x.models.map((m) => ({
          name: m.name,
          estCost: Math.round(
            unitCost(m) * (0.95 + Math.random() * 0.1) / 500
          ) * 500
        }))
      }));
    }
    if (t.dec.buyClinic) {
      r.clinic = [];
      for (const x of st.teams) {
        for (const m of x.models) {
          const sc = scoreModel(m, x);
          const row = { team: x.name, color: x.color, model: m.name, cells: {} };
          for (const s of SEGMENTS)
            row.cells[s.id] = Math.round(100 * qualityFit(sc, s)) + "/" + Math.round(100 * priceFit(m.price, s));
          r.clinic.push(row);
        }
      }
    }
    t.dec.buyIntel = false;
    t.dec.buyClinic = false;
    t.dec.vc = null;
    t.dec.claims = t.dec.claims || [];
  }
  const news = [];
  news.push(`${season.label}. Category demand this quarter: ${Math.round(tam).toLocaleString("en-IN")} units.`);
  const ranked = [...st.teams].sort((a, b) => b.hist[b.hist.length - 1].units - a.hist[a.hist.length - 1].units);
  news.push(`<b>${ranked[0].name}</b> leads the quarter with ${ranked[0].hist[ranked[0].hist.length - 1].units.toLocaleString("en-IN")} units sold.`);
  st.teams.forEach((t) => {
    const r = t.hist[t.hist.length - 1];
    if (r.shareIssueAmt && r.shareIssueAmt > 0) {
      news.push(
        `<b>${t.name}</b> completed a public share issuance: raised Rs. ${r.shareIssueAmt.toLocaleString(
          "en-IN"
        )} L in new equity capital (Stock price: Rs. ${r.stockPrice?.toFixed(2)}).`
      );
    }
    if (r.shareBuybackAmt && r.shareBuybackAmt > 0) {
      news.push(
        `<b>${t.name}</b> repurchased Rs. ${r.shareBuybackAmt.toLocaleString(
          "en-IN"
        )} L of treasury shares, enhancing shareholder value and EPS.`
      );
    }
    if (r.dividendsPaid && r.dividendsPaid > 0) {
      news.push(
        `<b>${t.name}</b> rewarded shareholders with Rs. ${r.dividendsPaid.toLocaleString(
          "en-IN"
        )} L in cash dividend payouts.`
      );
    }
    if (r.vcDeal && r.vcDeal.funded > 0)
      news.push(
        `<b>${t.name}</b> closed a VC round: Rs. ${r.vcDeal.funded.toLocaleString(
          "en-IN"
        )} L for ${r.vcDeal.offered.toFixed(1)}% equity.`
      );
    if (r.vcDeal && r.vcDeal.funded === 0)
      news.push(`<b>${t.name}</b> walked away from the VC table unfunded.`);
    if (r.stockout)
      news.push(
        `<b>${t.name}</b> ran out of stock: ${r.lost.toLocaleString(
          "en-IN"
        )} orders unserved. Reputation hit.`
      );
    if (r.chLoss > 50)
      news.push(
        `<b>${t.name}</b> lost ${r.chLoss.toLocaleString(
          "en-IN"
        )} units of output to changeovers and shop-floor productivity.`
      );
    if (r.profit < -150)
      news.push(
        `<b>${t.name}</b> posted a heavy loss of Rs. ${Math.abs(
          r.profit
        ).toFixed(0)} L. Cash runway shortening.`
      );
    if (r.sharkNew > 0)
      news.push(
        `<b>${t.name}</b> needed an emergency loan of Rs. ${r.sharkNew.toFixed(
          0
        )} L from loan shark.`
      );
    if (r.capAdd > 0)
      news.push(
        `<b>${t.name}</b> broke ground on new lines: +${r.capAdd.toLocaleString(
          "en-IN"
        )} units/quarter capacity.`
      );
    if (r.bankrupt && !t._bkAnnounced) {
      news.push(
        `<b>${t.name}</b> is technically bankrupt: cumulative losses wiped out shareholder equity.`
      );
      t._bkAnnounced = true;
    }
  });
  for (const c of st.contracts)
    if (c.qExecuted === q) {
      news.push(
        `<b>Technology transfer:</b> ${st.teams[c.sellerI].name} licensed <b>${techById(c.techId).name}</b> to ${st.teams[c.buyerI].name} for Rs. ${c.fee.toLocaleString(
          "en-IN"
        )} L.`
      );
    }
  const segShare = {};
  for (const s of SEGMENTS) {
    segShare[s.id] = st.teams.map(
      (t) => offers.filter((o) => o.t === t).reduce((x, o) => x + o.sales[s.id], 0)
    );
  }
  st.reports.push({
    q,
    season: season.label,
    tam: Math.round(tam),
    news,
    segShare,
    priceTable: offers.map((o) => ({
      team: o.t.name,
      color: o.t.color,
      model: o.m.name,
      price: o.m.price,
      units: Math.round(SEGMENTS.reduce((x, s) => x + o.sales[s.id], 0))
    }))
  });
  st.quarter++;
  st.phase = st.quarter > st.cfg.quarters ? "gameover" : "results";
}
__name(simulateQuarter, "simulateQuarter");

// ../src/lib/batteryLifecycle.ts
var BATTERY_RETURN_RATE = 0.1;
var REPURPOSE_REVENUE_PER_UNIT = 0.12;
var REPURPOSE_PROCESSING_COST_PER_UNIT = 0.025;
var RECYCLE_COST_PER_UNIT = 0.03;
function batteryReturnsForQuarter(hist, quarter) {
  if (quarter < 5) return 0;
  const firstLifeSales = hist.filter((result) => Number(result.q) === 1 || Number(result.q) === 2).reduce((total, result) => total + Number(result.units || 0), 0);
  return Math.round(firstLifeSales * BATTERY_RETURN_RATE);
}
__name(batteryReturnsForQuarter, "batteryReturnsForQuarter");
function projectBatteryLifecycle(hist, quarter) {
  const returnedUnits = batteryReturnsForQuarter(hist, quarter);
  const q1Q2Warranty = hist.filter((result) => Number(result.q) === 1 || Number(result.q) === 2).reduce((total, result) => total + Number(result.warranty || 0), 0);
  const q1Q2Units = hist.filter((result) => Number(result.q) === 1 || Number(result.q) === 2).reduce((total, result) => total + Number(result.units || 0), 0);
  const warrantyReserve = q1Q2Units > 0 ? q1Q2Warranty / q1Q2Units : 0;
  return {
    quarter,
    returnedUnits,
    warrantyReserve,
    options: {
      warranty: { cost: returnedUnits * warrantyReserve, revenue: 0, esgImpact: -2 },
      repurpose: { cost: returnedUnits * REPURPOSE_PROCESSING_COST_PER_UNIT, revenue: returnedUnits * REPURPOSE_REVENUE_PER_UNIT, esgImpact: 5 },
      recycle: { cost: returnedUnits * RECYCLE_COST_PER_UNIT, revenue: 0, esgImpact: 10 }
    }
  };
}
__name(projectBatteryLifecycle, "projectBatteryLifecycle");
function applyBatteryLifecycle(result, hist, quarter, disposition) {
  const projection = projectBatteryLifecycle(hist, quarter);
  const selected = projection.options[disposition] || projection.options.warranty;
  const netImpact = selected.revenue - selected.cost;
  result.batteryReturns = projection.returnedUnits;
  result.batteryDisposition = disposition;
  result.batteryLifecycleCost = selected.cost;
  result.batteryLifecycleRevenue = selected.revenue;
  result.sustainabilityScore = selected.esgImpact;
  result.revenue += selected.revenue;
  result.ebitda += netImpact;
  result.profit += netImpact;
  result.cash += netImpact;
  return { projection, cost: selected.cost, revenue: selected.revenue, esgImpact: selected.esgImpact };
}
__name(applyBatteryLifecycle, "applyBatteryLifecycle");

// ../src/lib/processQuarter.ts
var regions = /* @__PURE__ */ __name((state) => Array.isArray(state.regions) && state.regions.length ? state.regions.map((region) => String(region.name || region.id || region)).filter(Boolean) : ["Global"], "regions");
var batteryRanges = { BC1: 100, BC2: 80, BC3: 75, BC4: 65, BC5: 50 };
function meetsEligibility(model, condition) {
  if (!condition) return true;
  const match2 = condition.trim().match(/^([a-z_]+)\s*(>=|<=|=|>|<)\s*([\d.]+)\s*km?$/i);
  if (!match2) return false;
  const [, field, operator, rawValue] = match2;
  const metrics = {
    battery_range: batteryRanges[model?.cfg?.battery] || Number(model?.range) || 0,
    charging_score: Number(model?.chargingScore) || ({ BC1: 10, BC2: 7.5, BC3: 6, BC4: 5, BC5: 4 }[model?.cfg?.battery] || 0)
  };
  const actual = metrics[field.toLowerCase()];
  const expected = Number(rawValue);
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  return operator === ">=" ? actual >= expected : operator === "<=" ? actual <= expected : operator === ">" ? actual > expected : operator === "<" ? actual < expected : actual === expected;
}
__name(meetsEligibility, "meetsEligibility");
function policyImpact(model, segment, region, quarter, policies) {
  return policies.filter((event) => event.quarter === quarter && (event.region === "Global" || event.region === region)).filter((event) => !event.eligible_segment || event.eligible_segment === segment.id || event.eligible_segment.toLowerCase() === segment.name.toLowerCase()).filter((event) => meetsEligibility(model, event.eligibility_condition)).reduce((impact, event) => impact + Number(event.demand_impact_pct || 0), 0);
}
__name(policyImpact, "policyImpact");
function calculateDemand(state, universeId, policies = []) {
  const quarter = state.quarter;
  const season = (quarter - 1) % 4 === 1 ? 0.9 : (quarter - 1) % 4 === 2 ? 1.25 : 1;
  const tam = state.cfg.tam0 * Math.pow(1 + state.cfg.growth, quarter - 1) * season;
  const output = [];
  for (const region of regions(state)) for (const team of state.teams) {
    const salesProductivity = hrMults(state, team).sales;
    const coverage = Math.max(0.05, Math.min(1, reachOf(team, salesProductivity)));
    for (const model of team.models) for (const segment of SEGMENTS) {
      const scores = scoreModel(model, team);
      let brandJudgment = Math.max(0, Math.min(100, qualityFit(scores, segment) * 100));
      if (model.brandLoyaltyCarryOver) brandJudgment = Math.min(100, brandJudgment * 1.05);
      const priceJudgment = Math.max(0, Math.min(100, priceFit(model.price, segment) * 100));
      const spend = (Number(team.dec.ad) || 0) * (Number(team.dec.alloc?.[segment.id]) || 0) / 100;
      const claimFit = (team.dec.claims || []).reduce((total, claim) => total + (segment.w[claim] || 0), 0) / 100;
      const advertisingImpact = Math.max(0, Math.min(1, (team.dec.claims?.length ? 0.8 + 0.8 * claimFit : 0.9) * 0.9 * (1 - Math.exp(-spend / 120))));
      const baseSize = tam * segment.pct / regions(state).length;
      const policyDemandImpactPct = policyImpact(model, segment, region, quarter, policies);
      const demandUnits = baseSize * brandJudgment / 100 * priceJudgment / 100 * advertisingImpact * salesProductivity * coverage * (1 + policyDemandImpactPct);
      output.push({
        demand_id: `${universeId}:${quarter}:${region}:${team.i}:${model.id}:${segment.id}`,
        universe_id: universeId,
        quarter,
        region,
        team_i: String(team.i),
        brand_id: model.id,
        brand_name: model.name,
        segment_id: segment.id,
        base_segment_size: baseSize,
        brand_judgment_score: brandJudgment,
        price_judgment_score: priceJudgment,
        advertising_impact_score: advertisingImpact,
        sales_force_productivity: salesProductivity,
        channel_coverage_factor: coverage,
        demand_units: demandUnits,
        policy_demand_impact_pct: policyDemandImpactPct
      });
    }
  }
  return output;
}
__name(calculateDemand, "calculateDemand");
function processQuarterState(state, universeId = "pending", policies = [], batteryDecisions = []) {
  const quarter = state.quarter;
  const demand = calculateDemand(state, universeId, policies);
  const logs = [
    { step: "lock", status: "complete", detail: `Locked decisions for Q${quarter}.` },
    { step: "demand", status: "complete", detail: `Computed ${demand.length} regional brand-segment demand rows.` }
  ];
  simulateQuarter(state);
  const lifecycle = state.teams.map((team) => {
    const decision = batteryDecisions.find((item) => String(item.teamId) === String(team.i))?.disposition || "warranty";
    const result = team.hist[team.hist.length - 1];
    const applied = applyBatteryLifecycle(result, team.hist, quarter, decision);
    team.cumProfit += applied.revenue - applied.cost;
    team.cumRevenue += applied.revenue;
    result.bsc = computeBSC(team, result, state);
    return { teamId: String(team.i), disposition: decision, ...applied };
  });
  const results = state.teams.reduce((count3, team) => count3 + (team.hist.some((row) => row.q === quarter) ? 1 : 0), 0);
  logs.push({ step: "production", status: "complete", detail: `Simulated production for ${results} team${results === 1 ? "" : "s"}.` });
  logs.push({ step: "sales", status: "complete", detail: "Allocated actual sales against available inventory." });
  logs.push({ step: "financials", status: "complete", detail: "Updated revenue, COGS, warranty, advertising, and salaries." });
  if (quarter >= 5) logs.push({ step: "battery", status: "complete", detail: `Processed ${lifecycle.reduce((total, item) => total + item.projection.returnedUnits, 0).toLocaleString()} end-of-first-life batteries.` });
  logs.push({ step: "scores", status: "complete", detail: "Computed Fast Test inputs and balanced scorecards." });
  logs.push({ step: "advance", status: "complete", detail: `Advanced game to Q${state.quarter}.` });
  logs.push({ step: "unlock", status: "complete", detail: `Unlocked decisions for Q${state.quarter}.` });
  return { state, logs, demand };
}
__name(processQuarterState, "processQuarterState");
function scorecardRecords(state, quarter) {
  return state.teams.map((team) => {
    const result = team.hist.find((row) => row.q === quarter);
    const score = result?.bsc || computeBSC(team, result, state);
    return { teamId: String(team.i), teamName: team.name, score: score.total, dimensions: score.parts, raw: result || {} };
  });
}
__name(scorecardRecords, "scorecardRecords");
async function runQuarterWorkflow(db, universeId) {
  await db.exec(`CREATE TABLE IF NOT EXISTS game_state (universe_id TEXT PRIMARY KEY, quarter INTEGER NOT NULL DEFAULT 1, decisions_locked INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS policy_events (event_id TEXT PRIMARY KEY, quarter INTEGER NOT NULL, region TEXT NOT NULL, event_type TEXT NOT NULL, description TEXT NOT NULL, demand_impact_pct REAL NOT NULL DEFAULT 0, cost_impact_pct REAL NOT NULL DEFAULT 0, eligible_segment TEXT, eligibility_condition TEXT);
    CREATE TABLE IF NOT EXISTS demand_results (demand_id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, quarter INTEGER NOT NULL, region TEXT NOT NULL, team_i TEXT NOT NULL, brand_id TEXT NOT NULL, brand_name TEXT NOT NULL, segment_id TEXT NOT NULL, base_segment_size REAL NOT NULL, brand_judgment_score REAL NOT NULL, price_judgment_score REAL NOT NULL, advertising_impact_score REAL NOT NULL, sales_force_productivity REAL NOT NULL, channel_coverage_factor REAL NOT NULL, demand_units REAL NOT NULL, policy_demand_impact_pct REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS fast_test_results (result_id TEXT PRIMARY KEY, team_id TEXT NOT NULL, quarter INTEGER NOT NULL, region TEXT NOT NULL, result_type TEXT NOT NULL, subject_id TEXT NOT NULL, subject_name TEXT NOT NULL, segment_id TEXT NOT NULL, segment_name TEXT NOT NULL, brand_judgment REAL, price_judgment REAL, ad_judgment REAL, reliability_judgment REAL, purchase_cost REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (team_id, quarter, region, result_type, subject_id, segment_id));
    CREATE TABLE IF NOT EXISTS balanced_scorecard (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i TEXT NOT NULL, quarter INTEGER NOT NULL, team_name TEXT NOT NULL, overall_score REAL NOT NULL, dimensions_json TEXT NOT NULL, raw_metrics_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter));
    CREATE TABLE IF NOT EXISTS battery_lifecycle_decisions (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i TEXT NOT NULL, quarter INTEGER NOT NULL, disposition TEXT NOT NULL CHECK (disposition IN ('warranty', 'repurpose', 'recycle')), returned_units REAL NOT NULL DEFAULT 0, warranty_reserve REAL NOT NULL DEFAULT 0, cost REAL NOT NULL DEFAULT 0, revenue REAL NOT NULL DEFAULT 0, esg_impact REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter));`);
  try {
    await db.exec("ALTER TABLE demand_results ADD COLUMN policy_demand_impact_pct REAL NOT NULL DEFAULT 0");
  } catch {
  }
  const universe = await db.prepare("SELECT id, game_state FROM universes WHERE id = ?").bind(universeId).first();
  if (!universe) throw new Error("Simulation universe was not found.");
  const state = typeof universe.game_state === "string" ? JSON.parse(universe.game_state) : universe.game_state;
  const currentQuarter = Number(state.quarter || 1);
  const policiesResponse = await db.prepare("SELECT * FROM policy_events WHERE quarter = ?").bind(currentQuarter).all();
  const policies = policiesResponse.results || [];
  const batteryResponse = await db.prepare("SELECT team_i, disposition FROM battery_lifecycle_decisions WHERE universe_id = ? AND quarter = ?").bind(universeId, currentQuarter).all();
  const batteryDecisions = (batteryResponse.results || []).map((row) => ({ teamId: String(row.team_i), disposition: row.disposition }));
  const marker = await db.prepare("SELECT decisions_locked, quarter FROM game_state WHERE universe_id = ?").bind(universeId).first();
  if (Number(marker?.decisions_locked) === 1) throw new Error(`Q${currentQuarter} is already being processed or locked.`);
  await db.prepare("INSERT INTO game_state (universe_id, quarter, decisions_locked) VALUES (?, ?, 1) ON CONFLICT(universe_id) DO UPDATE SET quarter = excluded.quarter, decisions_locked = 1, updated_at = datetime('now')").bind(universeId, currentQuarter).run();
  const schedules = await db.prepare("SELECT team_i, inputs_json, outputs_json FROM production_schedules WHERE universe_id = ? AND quarter = ?").bind(universeId, currentQuarter).all();
  for (const schedule of schedules.results || []) {
    const team = state.teams.find((candidate) => String(candidate.i) === String(schedule.team_i));
    if (team) {
      const inputs = JSON.parse(schedule.inputs_json || "{}");
      const outputs = JSON.parse(schedule.outputs_json || "{}");
      const scheduledProduction = Array.isArray(outputs.days) ? outputs.days.reduce((production, day) => {
        if (day.brandId) production[String(day.brandId)] = (production[String(day.brandId)] || 0) + Number(day.units || 0);
        return production;
      }, {}) : outputs.prod || outputs.production || inputs.prod || inputs.production;
      team.dec.prod = scheduledProduction && Object.keys(scheduledProduction).length ? scheduledProduction : team.dec.prod;
    }
  }
  state.teams.forEach((team) => {
    team.dec.locked = true;
  });
  const result = processQuarterState(state, universeId, policies, batteryDecisions);
  const lifecycleRows = result.state.teams.map((team) => {
    const quarterResult = team.hist.find((row) => row.q === currentQuarter);
    return db.prepare("UPDATE battery_lifecycle_decisions SET returned_units = ?, cost = ?, revenue = ?, esg_impact = ?, updated_at = datetime('now') WHERE universe_id = ? AND team_i = ? AND quarter = ?").bind(Number(quarterResult?.batteryReturns || 0), Number(quarterResult?.batteryLifecycleCost || 0), Number(quarterResult?.batteryLifecycleRevenue || 0), Number(quarterResult?.sustainabilityScore || 0), universeId, String(team.i), currentQuarter);
  });
  if (lifecycleRows.length) await db.batch(lifecycleRows);
  const demandColumns = "(demand_id, universe_id, quarter, region, team_i, brand_id, brand_name, segment_id, base_segment_size, brand_judgment_score, price_judgment_score, advertising_impact_score, sales_force_productivity, channel_coverage_factor, demand_units, policy_demand_impact_pct)";
  await db.batch(result.demand.map((row) => db.prepare(`INSERT OR REPLACE INTO demand_results ${demandColumns} VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(row.demand_id, row.universe_id, row.quarter, row.region, row.team_i, row.brand_id, row.brand_name, row.segment_id, row.base_segment_size, row.brand_judgment_score, row.price_judgment_score, row.advertising_impact_score, row.sales_force_productivity, row.channel_coverage_factor, row.demand_units, row.policy_demand_impact_pct)));
  const fastRows = result.demand.map((row) => {
    const segment = SEGMENTS.find((candidate) => candidate.id === row.segment_id);
    return db.prepare("INSERT OR REPLACE INTO fast_test_results (result_id, team_id, quarter, region, result_type, subject_id, subject_name, segment_id, segment_name, brand_judgment, price_judgment, ad_judgment, reliability_judgment) VALUES (?, ?, ?, ?, 'brand', ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(`fast:${row.demand_id}`, row.team_i, currentQuarter, row.region, row.brand_id, row.brand_name, row.segment_id, segment?.name || row.segment_id, row.brand_judgment_score, row.price_judgment_score, row.advertising_impact_score * 100, null);
  });
  await db.batch(fastRows);
  const reliabilityRows = result.state.teams.map((team) => {
    const quarterResult = team.hist.find((row) => row.q === currentQuarter);
    return db.prepare("INSERT OR REPLACE INTO fast_test_results (result_id, team_id, quarter, region, result_type, subject_id, subject_name, segment_id, segment_name, reliability_judgment) VALUES (?, ?, ?, 'Global', 'reliability', 'company', 'Company reliability', 'company', 'Company-wide', ?)").bind(`fast:${universeId}:${team.i}:${currentQuarter}:reliability`, String(team.i), currentQuarter, Math.round(Number(quarterResult?.reliab || 0) * 100));
  });
  await db.batch(reliabilityRows);
  const records = scorecardRecords(result.state, currentQuarter);
  await db.batch(records.map((record) => db.prepare("INSERT INTO balanced_scorecard (id, universe_id, team_i, quarter, team_name, overall_score, dimensions_json, raw_metrics_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(universe_id, team_i, quarter) DO UPDATE SET overall_score=excluded.overall_score, dimensions_json=excluded.dimensions_json, raw_metrics_json=excluded.raw_metrics_json, updated_at=datetime('now')").bind(`${universeId}:${record.teamId}:${currentQuarter}`, universeId, record.teamId, currentQuarter, record.teamName, record.score, JSON.stringify(record.dimensions), JSON.stringify(record.raw))));
  result.state.teams.forEach((team) => {
    team.dec.locked = false;
  });
  await db.prepare("UPDATE universes SET game_state = ?, updated_at = datetime('now') WHERE id = ?").bind(JSON.stringify(result.state), universeId).run();
  await db.prepare("UPDATE game_state SET quarter = ?, decisions_locked = 0, updated_at = datetime('now') WHERE universe_id = ?").bind(result.state.quarter, universeId).run();
  return { ...result, scorecards: records };
}
__name(runQuarterWorkflow, "runQuarterWorkflow");

// api/[[route]].ts
var MARKET_SURVEY_ERROR_MARGIN = { low: 0.15, medium: 0.08, high: 0.04 };
var MARKET_SURVEY_CATALOG_FALLBACK = {
  urban_commuter: "S2",
  fleet_operator: "S5",
  performance_enthusiast: "S4",
  tech_pioneer: "S1",
  eco_advocate: "S3"
};
function marketSurveyHashSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  return hash >>> 0;
}
__name(marketSurveyHashSeed, "marketSurveyHashSeed");
function marketSurveyRng(seed) {
  let a = seed;
  return /* @__PURE__ */ __name(function random() {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }, "random");
}
__name(marketSurveyRng, "marketSurveyRng");
function marketSurveyCatalogFallbackBase(segmentId, precisionLevel, purchaseCost) {
  const errorMargin = MARKET_SURVEY_ERROR_MARGIN[precisionLevel] ?? 0.15;
  const catalogId = MARKET_SURVEY_CATALOG_FALLBACK[segmentId] || SEGMENTS[0].id;
  const seg = SEGMENTS.find((candidate) => candidate.id === catalogId) || SEGMENTS[0];
  const scale = /* @__PURE__ */ __name((weight) => Math.round(50 + Number(weight || 0) * 3), "scale");
  const [wtpMinBase, wtpMaxBase] = seg.wtp;
  return {
    precision_level: precisionLevel,
    purchase_cost: purchaseCost,
    segment_id: segmentId,
    benefit_range_importance: scale(seg.w.range),
    benefit_charging_importance: scale(seg.w.charge),
    benefit_price_importance: scale(seg.w.econ),
    benefit_autonomy_importance: scale(seg.w.tech),
    benefit_design_importance: scale(seg.w.build),
    benefit_reliability_importance: scale(seg.w.safety),
    media_social_pref: scale(seg.w.tech),
    media_auto_press_pref: scale(seg.w.perf),
    media_business_press_pref: scale(seg.w.econ),
    media_ev_forums_pref: scale(seg.w.range),
    media_youtube_pref: scale(seg.w.build),
    wtp_min: Math.round(wtpMinBase * 10),
    wtp_expected: Math.round((wtpMinBase + wtpMaxBase) / 2 * 10),
    wtp_max: Math.round(wtpMaxBase * 10),
    segment_size_units: Math.round(seg.pct * 2e4),
    error_margin: errorMargin
  };
}
__name(marketSurveyCatalogFallbackBase, "marketSurveyCatalogFallbackBase");
function marketSurveyVaryForQuarter(base, universeId, quarter, segmentId, precisionLevel, purchaseCost) {
  const errorMargin = Number(base.error_margin ?? MARKET_SURVEY_ERROR_MARGIN[precisionLevel] ?? 0.15);
  const rng = marketSurveyRng(marketSurveyHashSeed(`${universeId}:${quarter}:${segmentId}`));
  const vary = /* @__PURE__ */ __name((value) => Math.round(Number(value || 0) * (1 + (rng() * 2 - 1) * errorMargin)), "vary");
  return {
    survey_id: `${universeId}:${quarter}:${precisionLevel}:${segmentId}`,
    universe_id: universeId,
    quarter,
    precision_level: precisionLevel,
    purchase_cost: purchaseCost,
    segment_id: segmentId,
    benefit_range_importance: vary(base.benefit_range_importance),
    benefit_charging_importance: vary(base.benefit_charging_importance),
    benefit_price_importance: vary(base.benefit_price_importance),
    benefit_autonomy_importance: vary(base.benefit_autonomy_importance),
    benefit_design_importance: vary(base.benefit_design_importance),
    benefit_reliability_importance: vary(base.benefit_reliability_importance),
    media_social_pref: vary(base.media_social_pref),
    media_auto_press_pref: vary(base.media_auto_press_pref),
    media_business_press_pref: vary(base.media_business_press_pref),
    media_ev_forums_pref: vary(base.media_ev_forums_pref),
    media_youtube_pref: vary(base.media_youtube_pref),
    wtp_min: vary(base.wtp_min),
    wtp_expected: vary(base.wtp_expected),
    wtp_max: vary(base.wtp_max),
    segment_size_units: vary(base.segment_size_units),
    error_margin: errorMargin
  };
}
__name(marketSurveyVaryForQuarter, "marketSurveyVaryForQuarter");
var componentBenefitKey = {
  Battery: "range",
  Charging: "charging",
  Autonomy: "autonomy",
  Motor: "image",
  Interior: "image",
  Exterior: "image",
  Software: "autonomy",
  Safety: "autonomy"
};
function jaroWinkler(first, second) {
  const a = first.trim().toLowerCase();
  const b = second.trim().toLowerCase();
  if (a === b) return 1;
  if (!a || !b) return 0;
  const matchDistance = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const firstMatches = new Array(a.length).fill(false);
  const secondMatches = new Array(b.length).fill(false);
  let matches = 0;
  for (let firstIndex = 0; firstIndex < a.length; firstIndex += 1) {
    const start = Math.max(0, firstIndex - matchDistance);
    const end = Math.min(firstIndex + matchDistance + 1, b.length);
    for (let secondIndex = start; secondIndex < end; secondIndex += 1) {
      if (secondMatches[secondIndex] || a[firstIndex] !== b[secondIndex]) continue;
      firstMatches[firstIndex] = true;
      secondMatches[secondIndex] = true;
      matches += 1;
      break;
    }
  }
  if (!matches) return 0;
  const firstOrdered = a.split("").filter((_, index) => firstMatches[index]);
  const secondOrdered = b.split("").filter((_, index) => secondMatches[index]);
  let transpositions = 0;
  for (let index = 0; index < firstOrdered.length; index += 1) {
    if (firstOrdered[index] !== secondOrdered[index]) transpositions += 1;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < Math.min(4, a.length, b.length) && a[prefix] === b[prefix]) prefix += 1;
  return jaro + prefix * 0.1 * (1 - jaro);
}
__name(jaroWinkler, "jaroWinkler");
function normalizeComponentIds(componentIds) {
  return [...new Set(componentIds.map((componentId) => String(componentId).trim()).filter(Boolean))].sort();
}
__name(normalizeComponentIds, "normalizeComponentIds");
var CLAIM_ALIASES = {
  range: "range",
  longestrangeinmarket: "range",
  charge: "charging",
  fastestcharginginmarket: "charging",
  charging: "charging",
  econ: "affordable",
  affordable: "affordable",
  mostaffordableev: "affordable",
  autonomy: "autonomy",
  mostautonomous: "autonomy",
  reliable: "reliable",
  reliability: "reliable",
  mostreliable: "reliable"
};
function claimType(claim) {
  const normalized = String(claim || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return CLAIM_ALIASES[normalized] || normalized;
}
__name(claimType, "claimType");
function readJson(value) {
  if (typeof value !== "string") return value || {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
__name(readJson, "readJson");
function auditValue(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value ?? "");
  } catch {
    return String(value ?? "");
  }
}
__name(auditValue, "auditValue");
function modelMetrics(model, components) {
  const config2 = model?.cfg || {};
  const componentIds = Array.isArray(model?.componentIds) ? model.componentIds : [];
  const selectedComponents = componentIds.map((id) => components.get(id)).filter(Boolean);
  const byCategory = /* @__PURE__ */ __name((category) => selectedComponents.filter((component) => component.category === category), "byCategory");
  const battery = byCategory("Battery")[0];
  const charging = byCategory("Charging")[0];
  const autonomy = byCategory("Autonomy")[0];
  const legacyRange = { BC1: 10, BC2: 8, BC3: 7.5, BC4: 6.5, BC5: 4.5 };
  const legacyCharging = { BC1: 10, BC2: 7.5, BC3: 6, BC4: 5, BC5: 4 };
  const legacyAutonomy = { CT1: 1.5, CT2: 5, CT3: 7.5, CT4: 10 };
  return {
    range: Number(model?.range ?? battery?.performance_score ?? legacyRange[config2.battery] ?? 0),
    charging: Number(model?.charging ?? charging?.performance_score ?? legacyCharging[config2.battery] ?? 0),
    autonomy: Number(model?.autonomy ?? autonomy?.performance_score ?? legacyAutonomy[config2.tech] ?? 0),
    price: Number(model?.price || 0),
    hasDcFastCharge: Boolean(charging && /dc|fast|ultra/i.test(`${charging.component_id} ${charging.name}`))
  };
}
__name(modelMetrics, "modelMetrics");
function priorQuarterRecord(team, quarter) {
  return (team?.hist || []).find((record) => Number(record.q) === quarter - 1) || (team?.hist || []).slice(-1)[0] || {};
}
__name(priorQuarterRecord, "priorQuarterRecord");
var fastTestNumber = /* @__PURE__ */ __name((row, keys, fallback = 0) => {
  for (const key of keys) {
    const value = Number(row?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}, "fastTestNumber");
var fastTestText = /* @__PURE__ */ __name((row, keys, fallback = "") => {
  for (const key of keys) {
    if (row?.[key] !== void 0 && row?.[key] !== null && String(row[key]).trim()) return String(row[key]).trim();
  }
  return fallback;
}, "fastTestText");
async function optionalRows(db, sql, ...params) {
  try {
    const response = await db.prepare(sql).bind(...params).all();
    return response.results || [];
  } catch {
    return [];
  }
}
__name(optionalRows, "optionalRows");
async function computeFastTests(teamId, quarter, region, db) {
  if (!db) throw new Error("D1 database binding is required to compute fast tests.");
  const normalizedTeamId = String(teamId).trim();
  const normalizedRegion = String(region || "Global").trim() || "Global";
  if (!normalizedTeamId || !Number.isInteger(quarter) || quarter < 1) throw new Error("teamId and a positive integer quarter are required.");
  await db.exec(`CREATE TABLE IF NOT EXISTS fast_test_results (
    result_id TEXT PRIMARY KEY, team_id TEXT NOT NULL, quarter INTEGER NOT NULL, region TEXT NOT NULL,
    result_type TEXT NOT NULL CHECK (result_type IN ('brand', 'ad', 'reliability')),
    subject_id TEXT NOT NULL, subject_name TEXT NOT NULL, segment_id TEXT NOT NULL, segment_name TEXT NOT NULL,
    brand_judgment REAL, price_judgment REAL, ad_judgment REAL, reliability_judgment REAL,
    purchase_cost REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (team_id, quarter, region, result_type, subject_id, segment_id)
  );`);
  const decisionRows = await optionalRows(db, "SELECT decision_json FROM team_decisions WHERE team_i = ? AND quarter = ? ORDER BY submitted_at DESC LIMIT 1", normalizedTeamId, quarter);
  const decision = readJson(decisionRows[0]?.decision_json);
  const segments = await optionalRows(db, "SELECT * FROM market_segments ORDER BY segment_id");
  const components = await optionalRows(db, "SELECT * FROM vehicle_components");
  const componentMap = new Map(components.map((component) => [String(component.component_id), component]));
  const brands = await optionalRows(db, "SELECT * FROM brands WHERE team_id = ?", normalizedTeamId);
  const campaigns = await optionalRows(db, "SELECT * FROM ad_campaigns WHERE team_id = ? AND quarter = ?", normalizedTeamId, quarter);
  const universeRows = await optionalRows(db, "SELECT game_state FROM universes ORDER BY updated_at DESC");
  const state = universeRows.map((row) => readJson(row.game_state)).find((candidate) => (candidate.teams || []).some((team) => String(team.i) === normalizedTeamId || String(team.name) === normalizedTeamId));
  const stateTeam = (state?.teams || []).find((team) => String(team.i) === normalizedTeamId || String(team.name) === normalizedTeamId);
  const paidDecision = Object.keys(decision).length ? decision : stateTeam?.dec || {};
  const researchBudget = fastTestNumber(paidDecision, ["market_research_budget", "marketResearchBudget"]);
  if (researchBudget <= 0) throw new Error("Purchase the Fast Test report with market_research_budget before computing it.");
  const purchaseCost = researchBudget;
  const designs = await optionalRows(db, "SELECT decision_json FROM team_decisions WHERE team_i = ? AND quarter <= ? ORDER BY quarter DESC, submitted_at DESC", normalizedTeamId, quarter);
  const designRows = designs.map((row) => readJson(row.decision_json)).filter((row) => row.type === "vehicle_design");
  const subjects = brands.length ? brands : designRows.length ? designRows : stateTeam?.models || [];
  const normalizedSegments = segments.length ? segments : Object.entries(stateTeam?.base || {}).map(([id, row]) => ({ segment_id: id, name: id, ...row }));
  const benefitForComponent = { Battery: "range", Charging: "charging", Autonomy: "autonomy", Motor: "perf", Interior: "comfort", Exterior: "image", Software: "autonomy", Safety: "safety" };
  const scoreBrand = /* @__PURE__ */ __name((brand, segment) => {
    const weights = {
      range: fastTestNumber(segment, ["range_priority", "range_importance", "range"]),
      charging: fastTestNumber(segment, ["charging_speed_priority", "charging_importance", "charging_speed"]),
      autonomy: fastTestNumber(segment, ["autonomy_priority", "autonomy_importance", "autonomy"]),
      image: fastTestNumber(segment, ["brand_image_priority", "design_importance", "image"]),
      perf: fastTestNumber(segment, ["performance_priority", "performance_importance", "perf"]),
      comfort: fastTestNumber(segment, ["comfort_priority", "comfort_importance", "comfort"]),
      safety: fastTestNumber(segment, ["safety_priority", "safety_importance", "safety"]),
      econ: fastTestNumber(segment, ["economy_priority", "price_importance", "econ"])
    };
    const componentIds = Array.isArray(brand.componentIds) ? brand.componentIds : Array.isArray(brand.component_ids) ? brand.component_ids : [];
    const config2 = brand.cfg || {};
    const tier = /* @__PURE__ */ __name((value, values) => values[String(value)] || 0, "tier");
    const performance2 = {
      range: brand.range ?? tier(config2.battery, { BC1: 10, BC2: 8, BC3: 7.5, BC4: 6.5, BC5: 4.5 }),
      charging: brand.charging ?? tier(config2.battery, { BC1: 10, BC2: 7.5, BC3: 6, BC4: 5, BC5: 4 }),
      autonomy: brand.autonomy ?? tier(config2.tech, { CT1: 1.5, CT2: 5, CT3: 7.5, CT4: 10 }),
      image: brand.image ?? tier(config2.build, { BD1: 10, BD2: 6, BD3: 4 }),
      perf: brand.perf ?? tier(config2.powertrain, { PT1: 10, PT2: 8, PT3: 6, PT4: 4 }),
      comfort: brand.comfort ?? tier(config2.seat, { WIDE: 10, STD: 6 }),
      safety: brand.safety ?? tier(config2.brakes, { BR1: 10, BR2: 7, BR3: 4 }),
      econ: brand.econ ?? 0
    };
    componentIds.map((id) => componentMap.get(String(id))).filter(Boolean).forEach((component) => {
      const benefit = benefitForComponent[component.category];
      if (benefit) performance2[benefit] = Math.max(performance2[benefit] || 0, fastTestNumber(component, ["performance_score", "performance"]));
    });
    const weightedTotal = Object.keys(weights).reduce((sum, key) => sum + Math.max(0, Number(performance2[key]) || 0) * weights[key], 0);
    const maxTotal = Object.values(weights).reduce((sum, weight) => sum + weight * 10, 0) || 1;
    const tolerance = fastTestNumber(segment, ["price_tolerance", "price_willing_to_pay", "price_willing_max", "wtp_max"], 6e4 - fastTestNumber(segment, ["price_sensitivity"], 0) * 3500);
    const price = fastTestNumber(brand, ["price", "msrp"], fastTestNumber(brand.cfg, ["price"]));
    return { brand: Math.max(0, Math.min(100, weightedTotal / maxTotal * 100 - Math.max(0, price - tolerance) / Math.max(1, tolerance) * 15)), price: price <= tolerance ? 100 : Math.max(0, 100 - (price - tolerance) / Math.max(1, tolerance) * 100) };
  }, "scoreBrand");
  const rows = [];
  for (const brand of subjects) for (const segment of normalizedSegments) {
    const scored = scoreBrand(brand, segment);
    const subjectId = fastTestText(brand, ["brand_id", "brandId", "id"], `${normalizedTeamId}-brand-${rows.length}`);
    rows.push({ result_id: `fast:${normalizedTeamId}:${quarter}:${normalizedRegion}:brand:${subjectId}:${segment.segment_id}`, team_id: normalizedTeamId, quarter, region: normalizedRegion, result_type: "brand", subject_id: subjectId, subject_name: fastTestText(brand, ["name", "brandName"], subjectId), segment_id: String(segment.segment_id), segment_name: fastTestText(segment, ["name", "segment_name"], String(segment.segment_id)), brand_judgment: Math.round(scored.brand), price_judgment: Math.round(scored.price), ad_judgment: null, reliability_judgment: null });
  }
  for (const campaign of campaigns) for (const segment of normalizedSegments) {
    const benefits = [1, 2, 3, 4, 5].map((index) => campaign[`benefit_${index}`]).filter(Boolean);
    const weights = benefits.reduce((sum, benefit, index) => sum + fastTestNumber(segment, [String(benefit), `${String(benefit)}_priority`, `${String(benefit)}_importance`]) / (index + 1), 0);
    const maxWeight = Math.max(1, Object.keys(segment).filter((key) => /priority|importance/.test(key)).reduce((sum, key) => sum + Number(segment[key] || 0), 0));
    rows.push({ result_id: `fast:${normalizedTeamId}:${quarter}:${normalizedRegion}:ad:${campaign.campaign_id}:${segment.segment_id}`, team_id: normalizedTeamId, quarter, region: normalizedRegion, result_type: "ad", subject_id: String(campaign.campaign_id), subject_name: fastTestText(campaign, ["campaign_name", "campaign_id"]), segment_id: String(segment.segment_id), segment_name: fastTestText(segment, ["name", "segment_name"], String(segment.segment_id)), brand_judgment: null, price_judgment: null, ad_judgment: Math.round(Math.max(0, Math.min(100, weights / maxWeight * 100))), reliability_judgment: null });
  }
  const quality = await optionalRows(db, "SELECT * FROM quality_components WHERE team_id = ?", normalizedTeamId);
  const warranty = quality.reduce((sum, item) => sum + fastTestNumber(item, ["warranty_cost_per_quarter"]), 0);
  const improvements = quality.reduce((sum, item) => sum + fastTestNumber(item, ["reliability_improvement"]) * (item.improvement_invested > 0 || item.source_action_study_done || item.variance_study_done ? 1 : 0), 0);
  const reliability = Math.max(0, Math.min(100, 100 - warranty / 10 + improvements));
  rows.push({ result_id: `fast:${normalizedTeamId}:${quarter}:${normalizedRegion}:reliability:company`, team_id: normalizedTeamId, quarter, region: normalizedRegion, result_type: "reliability", subject_id: "company", subject_name: "Company reliability", segment_id: "company", segment_name: "Company-wide", brand_judgment: null, price_judgment: null, ad_judgment: null, reliability_judgment: Math.round(reliability) });
  await db.batch(rows.map((row) => db.prepare(`INSERT INTO fast_test_results (result_id, team_id, quarter, region, result_type, subject_id, subject_name, segment_id, segment_name, brand_judgment, price_judgment, ad_judgment, reliability_judgment, purchase_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(result_id) DO UPDATE SET brand_judgment=excluded.brand_judgment, price_judgment=excluded.price_judgment, ad_judgment=excluded.ad_judgment, reliability_judgment=excluded.reliability_judgment, purchase_cost=excluded.purchase_cost`).bind(row.result_id, row.team_id, row.quarter, row.region, row.result_type, row.subject_id, row.subject_name, row.segment_id, row.segment_name, row.brand_judgment, row.price_judgment, row.ad_judgment, row.reliability_judgment, purchaseCost)));
  return rows;
}
__name(computeFastTests, "computeFastTests");
async function validateAdClaims(campaignId, teamId, quarter, db) {
  if (!db) throw new Error("D1 database binding is required to validate ad claims.");
  if (!Number.isInteger(quarter) || quarter < 1) throw new Error("quarter must be a positive integer.");
  await db.exec(`CREATE TABLE IF NOT EXISTS ad_violations (violation_id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, universe_id TEXT NOT NULL, team_id TEXT NOT NULL, claim TEXT NOT NULL, quarter INTEGER NOT NULL, offense_number INTEGER NOT NULL, penalty_type TEXT NOT NULL, fine_pct REAL NOT NULL DEFAULT 0, fine_amount REAL NOT NULL DEFAULT 0, ban_until_quarter INTEGER NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  const campaign = await db.prepare("SELECT * FROM ad_campaigns WHERE campaign_id = ?").bind(campaignId).first();
  if (!campaign) throw new Error("Advertising campaign was not found.");
  const campaignTeamId = String(teamId || campaign.team_id || "");
  const requestedUniverseId = campaign.universe_id || null;
  const universeRows = await db.prepare(requestedUniverseId ? "SELECT * FROM universes WHERE id = ?" : "SELECT * FROM universes ORDER BY updated_at DESC").bind(...requestedUniverseId ? [requestedUniverseId] : []).all();
  const universe = (universeRows.results || []).find((row) => {
    const state2 = readJson(row.game_state);
    return requestedUniverseId || (state2.teams || []).some((team) => String(team.i) === campaignTeamId || String(team.name) === campaignTeamId);
  });
  if (!universe) throw new Error("The campaign's universe could not be resolved.");
  const state = readJson(universe.game_state);
  const teams = Array.isArray(state.teams) ? state.teams : [];
  const targetTeam = teams.find((team) => String(team.i) === campaignTeamId || String(team.name) === campaignTeamId);
  if (!targetTeam) throw new Error("The campaign team was not found in the universe.");
  const componentRows = await db.prepare("SELECT component_id, category, name, performance_score FROM vehicle_components").all();
  const components = new Map((componentRows.results || []).map((row) => [String(row.component_id), row]));
  const decisionRows = await db.prepare("SELECT team_i, quarter, decision_json FROM team_decisions WHERE universe_id = ? AND quarter <= ? ORDER BY quarter DESC").bind(universe.id, quarter - 1).all();
  const latestDesigns = /* @__PURE__ */ new Map();
  for (const row of decisionRows.results || []) {
    const decision = readJson(row.decision_json);
    if (decision.type !== "vehicle_design") continue;
    const key = `${row.team_i}:${decision.brandId || decision.brandName || row.team_i}`;
    if (!latestDesigns.has(key)) latestDesigns.set(key, { teamId: String(row.team_i), ...decision });
  }
  const brandsByTeam = /* @__PURE__ */ new Map();
  for (const design of latestDesigns.values()) {
    const brands = brandsByTeam.get(design.teamId) || [];
    brands.push(modelMetrics(design, components));
    brandsByTeam.set(design.teamId, brands);
  }
  for (const team of teams) {
    const teamKey = String(team.i);
    if (!brandsByTeam.has(teamKey)) brandsByTeam.set(teamKey, (team.models || []).map((model) => modelMetrics(model, components)));
  }
  const targetBrands = brandsByTeam.get(String(targetTeam.i)) || [];
  const competitorBrands = [...brandsByTeam.entries()].filter(([id]) => id !== String(targetTeam.i)).flatMap(([, brands]) => brands);
  const targetPrior = priorQuarterRecord(targetTeam, quarter);
  const competitorPrior = teams.map((team) => priorQuarterRecord(team, quarter));
  const industryAverageReliability = competitorPrior.length ? competitorPrior.reduce((sum, record) => sum + Number(record.reliability_rating ?? record.reliabilityRating ?? record.reliab ?? 0), 0) / competitorPrior.length : 0;
  const claims = Array.from({ length: 5 }, (_, index) => campaign[`benefit_${index + 1}`]).filter(Boolean);
  const results = [];
  for (const claim of claims) {
    const type = claimType(claim);
    let valid = quarter === 1;
    let reason = quarter === 1 ? "First-quarter test market grace period." : "Claim is not supported by the market snapshot.";
    if (quarter > 1 && type === "range") {
      valid = targetBrands.length > 0 && competitorBrands.length > 0 && Math.max(...targetBrands.map((brand) => brand.range)) >= Math.max(...competitorBrands.map((brand) => brand.range));
      reason = "Team range must be at least as high as every competitor brand.";
    } else if (quarter > 1 && type === "charging") {
      valid = targetBrands.some((brand) => brand.hasDcFastCharge);
      reason = "Team must offer a DC fast-charge component on at least one brand.";
    } else if (quarter > 1 && type === "affordable") {
      valid = targetBrands.length > 0 && competitorBrands.length > 0 && Math.min(...targetBrands.map((brand) => brand.price)) <= Math.min(...competitorBrands.map((brand) => brand.price));
      reason = "Team's lowest-priced brand must be no higher than the lowest competitor brand.";
    } else if (quarter > 1 && type === "autonomy") {
      valid = targetBrands.length > 0 && competitorBrands.length > 0 && Math.max(...targetBrands.map((brand) => brand.autonomy)) >= Math.max(...competitorBrands.map((brand) => brand.autonomy));
      reason = "Team must have the highest autonomy component tier in the market.";
    } else if (quarter > 1 && type === "reliable") {
      valid = Number(targetPrior.reliability_rating ?? targetPrior.reliabilityRating ?? targetPrior.reliab ?? 0) >= industryAverageReliability;
      reason = "Team reliability must be at least the industry average.";
    }
    const result = { claim: String(claim), valid, reason };
    if (!valid) {
      const priorCount = await db.prepare("SELECT COUNT(*) AS count FROM ad_violations WHERE universe_id = ? AND team_id = ? AND claim = ?").bind(universe.id, campaignTeamId, type).first("count");
      const offenseNumber = Number(priorCount || 0) + 1;
      const finePct = offenseNumber < 2 ? 0 : (offenseNumber - 1) * 0.05;
      const revenue = Number(targetPrior.revenue || 0);
      const violation = { violation_id: `${campaignId}:${type}`, campaign_id: campaignId, universe_id: universe.id, team_id: campaignTeamId, claim: type, quarter, offense_number: offenseNumber, penalty_type: finePct ? "fine_and_ban" : "ban", fine_pct: finePct, fine_amount: revenue * finePct, ban_until_quarter: quarter + 4, reason };
      await db.prepare("INSERT OR IGNORE INTO ad_violations (violation_id, campaign_id, universe_id, team_id, claim, quarter, offense_number, penalty_type, fine_pct, fine_amount, ban_until_quarter, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(violation.violation_id, violation.campaign_id, violation.universe_id, violation.team_id, violation.claim, violation.quarter, violation.offense_number, violation.penalty_type, violation.fine_pct, violation.fine_amount, violation.ban_until_quarter, violation.reason).run();
      result.violation = violation;
    }
    results.push(result);
  }
  return { valid: results.every((result) => result.valid), results };
}
__name(validateAdClaims, "validateAdClaims");
async function onRequest(context2) {
  const { request, env: env2 } = context2;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  try {
    if (path === "/api/policy-events" && method === "GET") {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const quarter = Number(url.searchParams.get("quarter"));
      if (!Number.isInteger(quarter) || quarter < 1) return new Response(JSON.stringify({ error: "A positive integer quarter is required." }), { status: 400, headers: corsHeaders });
      await env2.DB.exec("CREATE TABLE IF NOT EXISTS policy_events (event_id TEXT PRIMARY KEY, quarter INTEGER NOT NULL, region TEXT NOT NULL, event_type TEXT NOT NULL, description TEXT NOT NULL, demand_impact_pct REAL NOT NULL DEFAULT 0, cost_impact_pct REAL NOT NULL DEFAULT 0, eligible_segment TEXT, eligibility_condition TEXT)");
      const events = await env2.DB.prepare("SELECT * FROM policy_events WHERE quarter = ? ORDER BY event_id").bind(quarter).all();
      return new Response(JSON.stringify({ events: events.results || [] }), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/rd/license" && (method === "GET" || method === "POST")) {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      await env2.DB.exec(`CREATE TABLE IF NOT EXISTS vehicle_components (component_id TEXT PRIMARY KEY, category TEXT, name TEXT, material_cost REAL, performance_score INTEGER, benefit_delivered TEXT, is_rd_unlocked INTEGER DEFAULT 0, available_from_quarter INTEGER DEFAULT 1); CREATE TABLE IF NOT EXISTS rd_projects (project_id TEXT PRIMARY KEY, name TEXT, description TEXT, component_unlocked TEXT NOT NULL); CREATE TABLE IF NOT EXISTS rd_project_completions (game_id TEXT NOT NULL, team_id TEXT NOT NULL, project_id TEXT NOT NULL, completed_quarter INTEGER NOT NULL, PRIMARY KEY (game_id, team_id, project_id)); CREATE TABLE IF NOT EXISTS rd_license_offers (id TEXT PRIMARY KEY, game_id TEXT NOT NULL, seller_team_id TEXT NOT NULL, buyer_team_id TEXT NOT NULL, project_id TEXT NOT NULL, license_fee REAL NOT NULL CHECK (license_fee >= 1), special_terms TEXT NOT NULL DEFAULT '', offered_quarter INTEGER NOT NULL, execute_quarter INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'offered' CHECK (status IN ('offered', 'accepted', 'rejected', 'executed')), accepted_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))); CREATE TABLE IF NOT EXISTS team_component_access (game_id TEXT NOT NULL, team_id TEXT NOT NULL, component_id TEXT NOT NULL, source_license_id TEXT, unlocked_quarter INTEGER NOT NULL, PRIMARY KEY (game_id, team_id, component_id));`);
      if (method === "GET") {
        const gameId2 = url.searchParams.get("game_id") || url.searchParams.get("universe_id") || "";
        const teamId = url.searchParams.get("team_id") || "";
        const quarter2 = Math.max(1, Number(url.searchParams.get("quarter") || 1));
        if (!gameId2 || !teamId) return new Response(JSON.stringify({ error: "game_id and team_id are required." }), { status: 400, headers: corsHeaders });
        await env2.DB.prepare("UPDATE rd_license_offers SET status = 'executed' WHERE game_id = ? AND status = 'accepted' AND execute_quarter <= ?").bind(gameId2, quarter2).run();
        const due2 = await env2.DB.prepare("SELECT * FROM rd_license_offers WHERE game_id = ? AND status = 'executed' AND execute_quarter <= ?").bind(gameId2, quarter2).all();
        for (const offer2 of due2.results || []) await env2.DB.prepare("INSERT OR IGNORE INTO team_component_access (game_id, team_id, component_id, source_license_id, unlocked_quarter) SELECT ?, ?, component_unlocked, ?, ? FROM rd_projects WHERE project_id = ?").bind(gameId2, offer2.buyer_team_id, offer2.id, offer2.execute_quarter, offer2.project_id).run();
        const available = await env2.DB.prepare("SELECT p.project_id, p.name, p.description, p.component_unlocked, c.name AS component_name, c.category, c.benefit_delivered, x.team_id AS seller_team_id FROM rd_projects p JOIN vehicle_components c ON c.component_id = p.component_unlocked JOIN rd_project_completions x ON x.game_id = ? AND x.project_id = p.project_id AND x.completed_quarter < ? WHERE x.team_id <> ? AND NOT EXISTS (SELECT 1 FROM team_component_access a WHERE a.game_id = ? AND a.team_id = ? AND a.component_id = p.component_unlocked) ORDER BY p.name").bind(gameId2, quarter2, teamId, gameId2, teamId).all();
        const outbound = await env2.DB.prepare("SELECT * FROM rd_license_offers WHERE game_id = ? AND seller_team_id = ? ORDER BY created_at DESC").bind(gameId2, teamId).all();
        return new Response(JSON.stringify({ available: available.results || [], outbound: outbound.results || [] }), { status: 200, headers: corsHeaders });
      }
      const body = await request.json();
      const gameId = String(body.game_id || request.headers.get("X-Game-Id") || "").trim();
      const quarter = Number(body.quarter);
      if (!gameId || !body.buyer_team_id || !Number.isInteger(quarter) || quarter < 1 || body.action !== "accept" && (!body.seller_team_id || !body.project_id)) return new Response(JSON.stringify({ error: "game_id, buyer_team_id, and a positive integer quarter are required; offers also require seller_team_id and project_id." }), { status: 400, headers: corsHeaders });
      await env2.DB.prepare("UPDATE rd_license_offers SET status = 'executed' WHERE game_id = ? AND status = 'accepted' AND execute_quarter <= ?").bind(gameId, quarter).run();
      const due = await env2.DB.prepare("SELECT * FROM rd_license_offers WHERE game_id = ? AND status = 'executed' AND execute_quarter <= ?").bind(gameId, quarter).all();
      for (const offer2 of due.results || []) {
        await env2.DB.prepare("INSERT OR IGNORE INTO team_component_access (game_id, team_id, component_id, source_license_id, unlocked_quarter) SELECT ?, ?, component_unlocked, ?, ? FROM rd_projects WHERE project_id = ?").bind(gameId, offer2.buyer_team_id, offer2.id, offer2.execute_quarter, offer2.project_id).run();
      }
      if (body.action === "accept") {
        const offer2 = await env2.DB.prepare("SELECT * FROM rd_license_offers WHERE id = ? AND game_id = ? AND buyer_team_id = ?").bind(String(body.license_id || ""), gameId, String(body.buyer_team_id)).first();
        if (!offer2 || offer2.status !== "offered") return new Response(JSON.stringify({ error: "Offer is missing or no longer open." }), { status: 409, headers: corsHeaders });
        await env2.DB.prepare("UPDATE rd_license_offers SET status = 'accepted', accepted_at = datetime('now') WHERE id = ? AND status = 'offered'").bind(offer2.id).run();
        return new Response(JSON.stringify({ success: true, offer: { ...offer2, status: "accepted" } }), { status: 200, headers: corsHeaders });
      }
      const fee = Number(body.license_fee);
      if (!Number.isFinite(fee) || fee < 1) return new Response(JSON.stringify({ error: "license_fee must be at least 1." }), { status: 400, headers: corsHeaders });
      if (String(body.seller_team_id) === String(body.buyer_team_id)) return new Response(JSON.stringify({ error: "Seller and buyer must be different teams." }), { status: 400, headers: corsHeaders });
      const completion = await env2.DB.prepare("SELECT completed_quarter FROM rd_project_completions WHERE game_id = ? AND team_id = ? AND project_id = ? AND completed_quarter < ? ORDER BY completed_quarter DESC LIMIT 1").bind(gameId, String(body.seller_team_id), String(body.project_id), quarter).first();
      if (!completion) return new Response(JSON.stringify({ error: "Seller must have completed this R&D project in a prior quarter." }), { status: 409, headers: corsHeaders });
      const id = crypto.randomUUID();
      const offer = { id, game_id: gameId, seller_team_id: String(body.seller_team_id), buyer_team_id: String(body.buyer_team_id), project_id: String(body.project_id), license_fee: fee, special_terms: typeof body.special_terms === "string" ? body.special_terms.trim() : "", offered_quarter: quarter, execute_quarter: quarter + 1, status: "offered" };
      await env2.DB.prepare("INSERT INTO rd_license_offers (id, game_id, seller_team_id, buyer_team_id, project_id, license_fee, special_terms, offered_quarter, execute_quarter, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'offered')").bind(offer.id, offer.game_id, offer.seller_team_id, offer.buyer_team_id, offer.project_id, offer.license_fee, offer.special_terms, offer.offered_quarter, offer.execute_quarter).run();
      return new Response(JSON.stringify({ success: true, offer }), { status: 201, headers: corsHeaders });
    }
    if (path === "/api/health") {
      return new Response(
        JSON.stringify({ status: "ok", provider: "Cloudflare Workers / D1", app: "EV Venture League Simulation" }),
        { status: 200, headers: corsHeaders }
      );
    }
    if (path === "/api/decisions" && (method === "GET" || method === "POST" || method === "PUT")) {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      await env2.DB.exec("CREATE TABLE IF NOT EXISTS decision_audit_log (log_id TEXT PRIMARY KEY, team_id TEXT, quarter INTEGER, decision_area TEXT, field_changed TEXT, old_value TEXT, new_value TEXT, timestamp TEXT)");
      await env2.DB.exec("CREATE INDEX IF NOT EXISTS idx_decision_audit_team_quarter ON decision_audit_log(team_id, quarter, timestamp)");
      if (method === "GET") {
        const teamId2 = String(url.searchParams.get("teamId") || url.searchParams.get("team_id") || "").trim();
        const quarter2 = Number(url.searchParams.get("quarter"));
        const area = String(url.searchParams.get("decisionArea") || url.searchParams.get("decision_area") || "").trim();
        if (!teamId2 || !Number.isInteger(quarter2) || quarter2 < 1) return new Response(JSON.stringify({ error: "teamId and a positive integer quarter are required." }), { status: 400, headers: corsHeaders });
        const params = [teamId2, quarter2];
        let query = "SELECT log_id, team_id, quarter, decision_area, field_changed, old_value, new_value, timestamp FROM decision_audit_log WHERE team_id = ? AND quarter = ?";
        if (area) {
          query += " AND decision_area = ?";
          params.push(area);
        }
        query += " ORDER BY timestamp DESC, log_id DESC";
        const rows = await env2.DB.prepare(query).bind(...params).all();
        return new Response(JSON.stringify({ decisions: rows.results || [] }), { status: 200, headers: corsHeaders });
      }
      const body = await request.json();
      const teamId = String(body.teamId ?? body.team_id ?? "").trim();
      const quarter = Number(body.quarter);
      if (!teamId || !Number.isInteger(quarter) || quarter < 1) return new Response(JSON.stringify({ error: "teamId and a positive integer quarter are required." }), { status: 400, headers: corsHeaders });
      const decisionArea = String(body.decisionArea ?? body.decision_area ?? body.area ?? "General").trim() || "General";
      let changes = Array.isArray(body.changes) ? body.changes : [];
      if (!changes.length && body.oldDecision && body.newDecision && typeof body.oldDecision === "object" && typeof body.newDecision === "object") {
        const fields = /* @__PURE__ */ new Set([...Object.keys(body.oldDecision), ...Object.keys(body.newDecision)]);
        changes = [...fields].filter((field) => auditValue(body.oldDecision[field]) !== auditValue(body.newDecision[field])).map((field) => ({ fieldChanged: field, oldValue: body.oldDecision[field], newValue: body.newDecision[field] }));
      }
      if (!changes.length) changes = [{ fieldChanged: body.fieldChanged ?? body.field_changed ?? "decision", oldValue: body.oldValue ?? body.old_value ?? "", newValue: body.newValue ?? body.new_value ?? body.decision ?? body.value ?? "" }];
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      await env2.DB.batch(changes.map((change) => env2.DB.prepare(
        "INSERT INTO decision_audit_log (log_id, team_id, quarter, decision_area, field_changed, old_value, new_value, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        crypto.randomUUID(),
        teamId,
        quarter,
        String(change.decisionArea ?? change.decision_area ?? decisionArea).trim() || decisionArea,
        String(change.fieldChanged ?? change.field_changed ?? change.field ?? "decision"),
        auditValue(change.oldValue ?? change.old_value),
        auditValue(change.newValue ?? change.new_value),
        timestamp
      )));
      return new Response(JSON.stringify({ success: true, logged: changes.length, teamId, quarter }), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/process-quarter" && method === "POST") {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const body = await request.json();
      const universeId = String(body.universeId || "").trim();
      if (!universeId) return new Response(JSON.stringify({ error: "universeId is required." }), { status: 400, headers: corsHeaders });
      try {
        const result = await runQuarterWorkflow(env2.DB, universeId);
        return new Response(JSON.stringify({ success: true, quarter: result.state.quarter, logs: result.logs, demandRows: result.demand.length, scorecards: result.scorecards }), { status: 200, headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message || "Quarter processing failed." }), { status: err.message?.includes("already") ? 409 : 500, headers: corsHeaders });
      }
    }
    if (path === "/api/visibility-settings" && (method === "GET" || method === "POST")) {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      await env2.DB.exec("CREATE TABLE IF NOT EXISTS visibility_settings (id TEXT PRIMARY KEY, game_id TEXT NOT NULL UNIQUE, reveal_brand_specs INTEGER NOT NULL DEFAULT 0, reveal_sales_data INTEGER NOT NULL DEFAULT 0, reveal_financials INTEGER NOT NULL DEFAULT 0, reveal_rd_projects INTEGER NOT NULL DEFAULT 0, competitive_benchmark_purchasable INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT (datetime('now')))");
      await env2.DB.exec("CREATE INDEX IF NOT EXISTS idx_visibility_settings_game ON visibility_settings(game_id)");
      if (method === "GET") {
        const gameId = String(url.searchParams.get("game_id") || url.searchParams.get("universe_id") || "").trim();
        if (!gameId) return new Response(JSON.stringify({ error: "game_id parameter is required." }), { status: 400, headers: corsHeaders });
        const row = await env2.DB.prepare("SELECT * FROM visibility_settings WHERE game_id = ?").bind(gameId).first();
        if (row) {
          return new Response(JSON.stringify({ settings: row }), { status: 200, headers: corsHeaders });
        }
        return new Response(JSON.stringify({
          settings: {
            id: gameId,
            game_id: gameId,
            reveal_brand_specs: 0,
            reveal_sales_data: 0,
            reveal_financials: 0,
            reveal_rd_projects: 0,
            competitive_benchmark_purchasable: 1,
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          }
        }), { status: 200, headers: corsHeaders });
      }
      if (method === "POST") {
        const body = await request.json();
        const gameId = String(body.game_id || "").trim();
        if (!gameId) return new Response(JSON.stringify({ error: "game_id is required." }), { status: 400, headers: corsHeaders });
        const flags2 = [
          body.reveal_brand_specs,
          body.reveal_sales_data,
          body.reveal_financials,
          body.reveal_rd_projects,
          body.competitive_benchmark_purchasable
        ];
        const isValidFlag = /* @__PURE__ */ __name((val) => val === 0 || val === 1 || val === "0" || val === "1", "isValidFlag");
        if (!flags2.every(isValidFlag)) {
          return new Response(JSON.stringify({ error: "All flag values must be 0 or 1." }), { status: 400, headers: corsHeaders });
        }
        const reveal_brand_specs = Number(body.reveal_brand_specs);
        const reveal_sales_data = Number(body.reveal_sales_data);
        const reveal_financials = Number(body.reveal_financials);
        const reveal_rd_projects = Number(body.reveal_rd_projects);
        const competitive_benchmark_purchasable = Number(body.competitive_benchmark_purchasable);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await env2.DB.prepare(`
          INSERT INTO visibility_settings (id, game_id, reveal_brand_specs, reveal_sales_data, reveal_financials, reveal_rd_projects, competitive_benchmark_purchasable, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            game_id = excluded.game_id,
            reveal_brand_specs = excluded.reveal_brand_specs,
            reveal_sales_data = excluded.reveal_sales_data,
            reveal_financials = excluded.reveal_financials,
            reveal_rd_projects = excluded.reveal_rd_projects,
            competitive_benchmark_purchasable = excluded.competitive_benchmark_purchasable,
            updated_at = excluded.updated_at
        `).bind(gameId, gameId, reveal_brand_specs, reveal_sales_data, reveal_financials, reveal_rd_projects, competitive_benchmark_purchasable, now).run();
        const settings = {
          id: gameId,
          game_id: gameId,
          reveal_brand_specs,
          reveal_sales_data,
          reveal_financials,
          reveal_rd_projects,
          competitive_benchmark_purchasable,
          updated_at: now
        };
        return new Response(JSON.stringify({ success: true, settings }), { status: 200, headers: corsHeaders });
      }
    }
    if (path === "/api/competitive-benchmark" && (method === "GET" || method === "POST")) {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const body = method === "POST" ? await request.json() : {};
      const teamId = String(body.teamId || body.team_id || url.searchParams.get("teamId") || url.searchParams.get("team_id") || "").trim();
      const quarter = Number(body.quarter || url.searchParams.get("quarter"));
      const region = String(body.region || url.searchParams.get("region") || "Global").trim() || "Global";
      const scope = String(body.scope || url.searchParams.get("scope") || (region.toLowerCase() === "global" ? "global" : "region"));
      if (!teamId || !Number.isInteger(quarter) || quarter < 1 || !["region", "global"].includes(scope)) return new Response(JSON.stringify({ error: "teamId, a positive integer quarter, and a valid scope are required." }), { status: 400, headers: corsHeaders });
      await env2.DB.exec("CREATE TABLE IF NOT EXISTS competitive_benchmark_purchases (purchase_id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_id TEXT NOT NULL, quarter INTEGER NOT NULL, region TEXT NOT NULL, scope TEXT NOT NULL, cost REAL NOT NULL, report_json TEXT NOT NULL, purchased_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_id, quarter, region, scope))");
      const universe = await env2.DB.prepare("SELECT id, game_state FROM universes ORDER BY updated_at DESC LIMIT 1").first();
      if (!universe) return new Response(JSON.stringify({ error: "No simulation universe is available." }), { status: 404, headers: corsHeaders });
      const resolvedGameId = url.searchParams.get("game_id") || url.searchParams.get("universe_id") || body.game_id || body.universe_id || universe.id;
      if (resolvedGameId) {
        await env2.DB.exec("CREATE TABLE IF NOT EXISTS visibility_settings (id TEXT PRIMARY KEY, game_id TEXT NOT NULL UNIQUE, reveal_brand_specs INTEGER NOT NULL DEFAULT 0, reveal_sales_data INTEGER NOT NULL DEFAULT 0, reveal_financials INTEGER NOT NULL DEFAULT 0, reveal_rd_projects INTEGER NOT NULL DEFAULT 0, competitive_benchmark_purchasable INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT (datetime('now')))");
        const visRow = await env2.DB.prepare("SELECT * FROM visibility_settings WHERE game_id = ?").bind(resolvedGameId).first();
        if (method === "GET" && visRow && Number(visRow.competitive_benchmark_purchasable) === 0) {
          return new Response(JSON.stringify({ error: "Competitive benchmark reports have been disabled by the instructor." }), { status: 403, headers: corsHeaders });
        }
      }
      const purchase = await env2.DB.prepare("SELECT * FROM competitive_benchmark_purchases WHERE universe_id = ? AND team_id = ? AND quarter = ? AND region = ? AND scope = ?").bind(universe.id, teamId, quarter, region, scope).first();
      const cost = COMPETITIVE_BENCHMARK_REGION_COST * (scope === "global" ? 3 : 1);
      if (method === "GET") return new Response(JSON.stringify({ purchased: Boolean(purchase), cost, report: purchase ? readJson(purchase.report_json) : null }), { status: 200, headers: corsHeaders });
      if (Number(body.market_research_budget || body.budget) < cost) return new Response(JSON.stringify({ error: `Allocate at least Rs. ${cost} L to purchase this report.` }), { status: 402, headers: corsHeaders });
      const report2 = buildCompetitiveBenchmark(readJson(universe.game_state), quarter, region);
      await env2.DB.prepare("INSERT INTO competitive_benchmark_purchases (purchase_id, universe_id, team_id, quarter, region, scope, cost, report_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(universe_id, team_id, quarter, region, scope) DO UPDATE SET report_json = excluded.report_json, cost = excluded.cost, purchased_at = datetime('now')").bind(`${universe.id}:${teamId}:${quarter}:${region}:${scope}`, universe.id, teamId, quarter, region, scope, cost, JSON.stringify(report2)).run();
      return new Response(JSON.stringify({ success: true, purchased: true, cost, report: report2 }), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/fast-tests" && (method === "GET" || method === "POST")) {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const body = method === "POST" ? await request.json() : {};
      const teamId = String(body.teamId || body.team_id || url.searchParams.get("teamId") || url.searchParams.get("team_id") || "").trim();
      const quarter = Number(body.quarter || url.searchParams.get("quarter"));
      const region = String(body.region || url.searchParams.get("region") || "Global").trim() || "Global";
      if (!teamId || !Number.isInteger(quarter) || quarter < 1) return new Response(JSON.stringify({ error: "teamId and a positive integer quarter are required." }), { status: 400, headers: corsHeaders });
      if (method === "POST") {
        const results = await computeFastTests(teamId, quarter, region, env2.DB);
        return new Response(JSON.stringify({ success: true, purchased: true, results }), { status: 200, headers: corsHeaders });
      }
      const resultRows = await env2.DB.prepare("SELECT * FROM fast_test_results WHERE team_id = ? AND quarter = ? AND region = ? ORDER BY result_type, subject_name, segment_id").bind(teamId, quarter, region).all();
      let resultsList = resultRows.results || [];
      const resolvedGameId = url.searchParams.get("game_id") || url.searchParams.get("universe_id");
      let gameIdToUse = resolvedGameId;
      if (!gameIdToUse) {
        const universe = await env2.DB.prepare("SELECT id FROM universes ORDER BY updated_at DESC LIMIT 1").first();
        gameIdToUse = universe?.id;
      }
      if (gameIdToUse) {
        await env2.DB.exec("CREATE TABLE IF NOT EXISTS visibility_settings (id TEXT PRIMARY KEY, game_id TEXT NOT NULL UNIQUE, reveal_brand_specs INTEGER NOT NULL DEFAULT 0, reveal_sales_data INTEGER NOT NULL DEFAULT 0, reveal_financials INTEGER NOT NULL DEFAULT 0, reveal_rd_projects INTEGER NOT NULL DEFAULT 0, competitive_benchmark_purchasable INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT (datetime('now')))");
        const visRow = await env2.DB.prepare("SELECT * FROM visibility_settings WHERE game_id = ?").bind(gameIdToUse).first();
        const revealSalesData = visRow ? Number(visRow.reveal_sales_data) : 0;
        if (revealSalesData === 0) {
          resultsList = resultsList.map((row) => {
            const isOwnTeam = String(row.team_id || row.teamId) === teamId;
            if (!isOwnTeam) {
              const { unit_sales, units_sold, unit_sales_data, ...rest } = row;
              return rest;
            }
            return row;
          });
        }
      }
      return new Response(JSON.stringify({ success: true, purchased: resultsList.length > 0, results: resultsList }), { status: 200, headers: corsHeaders });
    }
    const MARKET_SURVEY_COST = { low: 5, medium: 15, high: 30 };
    if (path === "/api/market-survey" && method === "GET") {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const universeId = String(url.searchParams.get("universe_id") || "").trim();
      const teamId = String(url.searchParams.get("team_id") || "").trim();
      const quarter = Number(url.searchParams.get("quarter"));
      const precision = String(url.searchParams.get("precision") || "low").trim();
      if (!universeId || !teamId || !Number.isInteger(quarter) || quarter < 1 || !["low", "medium", "high"].includes(precision)) {
        return new Response(JSON.stringify({ error: "universe_id, team_id, a positive integer quarter, and a valid precision are required." }), { status: 400, headers: corsHeaders });
      }
      await env2.DB.exec("CREATE TABLE IF NOT EXISTS market_survey_results (survey_id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, quarter INTEGER NOT NULL, precision_level TEXT NOT NULL DEFAULT 'low' CHECK (precision_level IN ('low','medium','high')), purchase_cost REAL NOT NULL DEFAULT 0, segment_id TEXT NOT NULL, benefit_range_importance REAL, benefit_charging_importance REAL, benefit_price_importance REAL, benefit_autonomy_importance REAL, benefit_design_importance REAL, benefit_reliability_importance REAL, media_social_pref REAL, media_auto_press_pref REAL, media_business_press_pref REAL, media_ev_forums_pref REAL, media_youtube_pref REAL, wtp_min REAL, wtp_expected REAL, wtp_max REAL, segment_size_units INTEGER, error_margin REAL, created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, quarter, precision_level, segment_id))");
      await env2.DB.exec("CREATE TABLE IF NOT EXISTS market_survey_purchases (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_id TEXT NOT NULL, quarter INTEGER NOT NULL, precision_level TEXT NOT NULL CHECK (precision_level IN ('low','medium','high')), cost REAL NOT NULL DEFAULT 0, purchased_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_id, quarter, precision_level))");
      const purchaseRow = await env2.DB.prepare("SELECT 1 FROM market_survey_purchases WHERE universe_id = ? AND team_id = ? AND quarter = ? AND precision_level = ?").bind(universeId, teamId, quarter, precision).first();
      const purchased = Boolean(purchaseRow);
      if (!purchased) return new Response(JSON.stringify({ results: [], purchased: false }), { status: 200, headers: corsHeaders });
      const existingRows = await env2.DB.prepare("SELECT * FROM market_survey_results WHERE universe_id = ? AND quarter = ? AND precision_level = ? ORDER BY segment_id").bind(universeId, quarter, precision).all();
      let results = existingRows.results || [];
      if (!results.length) {
        const purchaseCost = MARKET_SURVEY_COST[precision];
        const priorSegmentRows = await env2.DB.prepare("SELECT DISTINCT segment_id FROM market_survey_results WHERE universe_id = ? AND precision_level = ?").bind(universeId, precision).all();
        let segmentIds = (priorSegmentRows.results || []).map((row) => String(row.segment_id));
        if (!segmentIds.length) {
          const marketSegmentRows = await env2.DB.prepare("SELECT segment_id FROM market_segments ORDER BY segment_id").all();
          segmentIds = (marketSegmentRows.results || []).map((row) => String(row.segment_id));
        }
        const generated = [];
        for (const segmentId of segmentIds) {
          const baseRow = await env2.DB.prepare("SELECT * FROM market_survey_results WHERE universe_id = ? AND precision_level = ? AND segment_id = ? ORDER BY quarter ASC LIMIT 1").bind(universeId, precision, segmentId).first();
          const base = baseRow || marketSurveyCatalogFallbackBase(segmentId, precision, purchaseCost);
          generated.push(marketSurveyVaryForQuarter(base, universeId, quarter, segmentId, precision, purchaseCost));
        }
        if (generated.length) {
          await env2.DB.batch(generated.map((row) => env2.DB.prepare(
            "INSERT INTO market_survey_results (survey_id, universe_id, quarter, precision_level, purchase_cost, segment_id, benefit_range_importance, benefit_charging_importance, benefit_price_importance, benefit_autonomy_importance, benefit_design_importance, benefit_reliability_importance, media_social_pref, media_auto_press_pref, media_business_press_pref, media_ev_forums_pref, media_youtube_pref, wtp_min, wtp_expected, wtp_max, segment_size_units, error_margin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(survey_id) DO NOTHING"
          ).bind(
            row.survey_id,
            row.universe_id,
            row.quarter,
            row.precision_level,
            row.purchase_cost,
            row.segment_id,
            row.benefit_range_importance,
            row.benefit_charging_importance,
            row.benefit_price_importance,
            row.benefit_autonomy_importance,
            row.benefit_design_importance,
            row.benefit_reliability_importance,
            row.media_social_pref,
            row.media_auto_press_pref,
            row.media_business_press_pref,
            row.media_ev_forums_pref,
            row.media_youtube_pref,
            row.wtp_min,
            row.wtp_expected,
            row.wtp_max,
            row.segment_size_units,
            row.error_margin
          )));
        }
        results = generated;
      }
      return new Response(JSON.stringify({ results, purchased: true, error_margin: results[0]?.error_margin }), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/market-survey/purchase" && method === "POST") {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const body = await request.json();
      const universeId = String(body.universe_id || "").trim();
      const teamId = String(body.team_id ?? "").trim();
      const quarter = Number(body.quarter);
      const precisionLevel = String(body.precision_level || "").trim();
      if (!universeId || !teamId || !Number.isInteger(quarter) || quarter < 1 || !["low", "medium", "high"].includes(precisionLevel)) {
        return new Response(JSON.stringify({ error: "universe_id, team_id, a positive integer quarter, and a valid precision_level are required." }), { status: 400, headers: corsHeaders });
      }
      const purchaseCost = MARKET_SURVEY_COST[precisionLevel];
      await env2.DB.exec("CREATE TABLE IF NOT EXISTS market_survey_results (survey_id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, quarter INTEGER NOT NULL, precision_level TEXT NOT NULL DEFAULT 'low' CHECK (precision_level IN ('low','medium','high')), purchase_cost REAL NOT NULL DEFAULT 0, segment_id TEXT NOT NULL, benefit_range_importance REAL, benefit_charging_importance REAL, benefit_price_importance REAL, benefit_autonomy_importance REAL, benefit_design_importance REAL, benefit_reliability_importance REAL, media_social_pref REAL, media_auto_press_pref REAL, media_business_press_pref REAL, media_ev_forums_pref REAL, media_youtube_pref REAL, wtp_min REAL, wtp_expected REAL, wtp_max REAL, segment_size_units INTEGER, error_margin REAL, created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, quarter, precision_level, segment_id))");
      const existingRows = await env2.DB.prepare("SELECT COUNT(*) AS count FROM market_survey_results WHERE universe_id = ? AND quarter = ? AND precision_level = ?").bind(universeId, quarter, precisionLevel).first();
      if (!existingRows || Number(existingRows.count) === 0) {
        return new Response(JSON.stringify({ error: "No market survey data is available for this universe, quarter, and precision level." }), { status: 404, headers: corsHeaders });
      }
      await env2.DB.exec("CREATE TABLE IF NOT EXISTS market_survey_purchases (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_id TEXT NOT NULL, quarter INTEGER NOT NULL, precision_level TEXT NOT NULL CHECK (precision_level IN ('low','medium','high')), cost REAL NOT NULL DEFAULT 0, purchased_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_id, quarter, precision_level))");
      await env2.DB.prepare("INSERT INTO market_survey_purchases (id, universe_id, team_id, quarter, precision_level, cost) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(universe_id, team_id, quarter, precision_level) DO UPDATE SET cost = excluded.cost, purchased_at = datetime('now')").bind(`${universeId}:${teamId}:${quarter}:${precisionLevel}`, universeId, teamId, quarter, precisionLevel, purchaseCost).run();
      return new Response(JSON.stringify({ success: true, cost: purchaseCost }), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/vehicle-designer" && method === "GET") {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const requestedQuarter = Number(url.searchParams.get("quarter") || 1);
      const currentQuarter = Number.isFinite(requestedQuarter) ? Math.max(1, requestedQuarter) : 1;
      const componentRows = await env2.DB.prepare(
        "SELECT component_id, category, name, material_cost, performance_score, benefit_delivered FROM vehicle_components WHERE available_from_quarter <= ? ORDER BY category, material_cost"
      ).bind(currentQuarter).all();
      const segmentRows = await env2.DB.prepare(
        "SELECT segment_id, name, price_sensitivity, range_priority, charging_speed_priority, autonomy_priority, brand_image_priority, segment_size_pct FROM market_segments ORDER BY segment_id"
      ).all();
      return new Response(JSON.stringify({
        components: (componentRows.results || []).map((row) => ({
          componentId: row.component_id,
          category: row.category,
          name: row.name,
          cost: Number(row.material_cost),
          performance: Number(row.performance_score),
          benefit: row.benefit_delivered,
          benefitKey: componentBenefitKey[row.category] || "range"
        })),
        segments: (segmentRows.results || []).map((row) => ({
          segmentId: row.segment_id,
          name: row.name,
          priceWillingToPay: Math.round(6e4 - Number(row.price_sensitivity || 0) * 3500),
          weights: {
            range: Number(row.range_priority || 0),
            charging: Number(row.charging_speed_priority || 0),
            autonomy: Number(row.autonomy_priority || 0),
            image: Number(row.brand_image_priority || 0)
          }
        }))
      }), { status: 200, headers: corsHeaders });
    }
    if (path.startsWith("/api/vehicle-designer/brands/") && method === "POST") {
      if (!env2.DB) {
        return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      }
      const brandId = decodeURIComponent(path.split("/").filter(Boolean).pop() || "");
      const body = await request.json();
      const quarter = Number(body.quarter);
      const componentIds = normalizeComponentIds(Array.isArray(body.componentIds) ? body.componentIds : []);
      const brandName = typeof body.brandName === "string" ? body.brandName.trim() : "";
      const multiplier = Number(body.multiplier ?? 2.5);
      const redesignFee = Math.max(0, Number(env2.VEHICLE_REDESIGN_FEE ?? 500));
      if (!brandId || !Number.isInteger(quarter) || quarter < 1 || !Number.isFinite(multiplier) || multiplier <= 0) {
        return new Response(JSON.stringify({ error: "brandId, a positive integer quarter, and a positive multiplier are required." }), { status: 400, headers: corsHeaders });
      }
      const decisionId = `vehicle-design:${brandId}:Q${quarter}`;
      const existingQuarter = await env2.DB.prepare(
        "SELECT id FROM team_decisions WHERE id = ?"
      ).bind(decisionId).first();
      const latestDecision = await env2.DB.prepare(
        "SELECT quarter, decision_json FROM team_decisions WHERE id LIKE ? AND quarter < ? ORDER BY quarter DESC LIMIT 1"
      ).bind(`vehicle-design:${brandId}:Q%`, quarter).first();
      const fee = existingQuarter ? 0 : latestDecision ? redesignFee : 0;
      let priorBrandName = brandId;
      let configurationChanged = false;
      if (latestDecision?.decision_json) {
        try {
          const priorDecision = JSON.parse(latestDecision.decision_json);
          priorBrandName = typeof priorDecision.brandName === "string" && priorDecision.brandName.trim() ? priorDecision.brandName.trim() : brandId;
          configurationChanged = JSON.stringify(normalizeComponentIds(priorDecision.componentIds || [])) !== JSON.stringify(componentIds);
        } catch {
          configurationChanged = true;
        }
      }
      if (configurationChanged && (!brandName || brandName.toLowerCase() === priorBrandName.toLowerCase())) {
        return new Response(JSON.stringify({
          error: "A changed component configuration requires a new brand name.",
          originalBrandName: priorBrandName
        }), { status: 400, headers: corsHeaders });
      }
      const finalBrandName = brandName || priorBrandName;
      const brandLoyaltyCarryOver = configurationChanged && jaroWinkler(finalBrandName, priorBrandName) >= 0.6 ? 1 : 0;
      const decision = JSON.stringify({
        type: "vehicle_design",
        brandId,
        brandName: finalBrandName,
        quarter,
        componentIds,
        multiplier,
        redesignFee: fee,
        brand_loyalty_carry_over: brandLoyaltyCarryOver
      });
      await env2.DB.prepare(`
        INSERT INTO team_decisions (id, universe_id, team_i, quarter, decision_json, redesign_fee, submitted_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET decision_json = excluded.decision_json, redesign_fee = excluded.redesign_fee, submitted_at = datetime('now'), submitted_by = excluded.submitted_by
      `).bind(
        decisionId,
        "vehicle-designer",
        -1,
        quarter,
        decision,
        fee,
        body.submittedBy || "vehicle-designer"
      ).run();
      return new Response(JSON.stringify({ success: true, brandId, brandName: finalBrandName, quarter, redesignFee: fee, brand_loyalty_carry_over: brandLoyaltyCarryOver, decisionId }), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/charging-network" && (method === "GET" || method === "POST")) {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const body = method === "POST" ? await request.json() : {};
      const teamId = String(body.teamId ?? url.searchParams.get("teamId") ?? "").trim();
      const quarter = Number(body.quarter ?? url.searchParams.get("quarter"));
      if (!teamId || !Number.isInteger(quarter) || quarter < 1) return new Response(JSON.stringify({ error: "teamId and a positive integer quarter are required." }), { status: 400, headers: corsHeaders });
      await env2.DB.exec("CREATE TABLE IF NOT EXISTS charging_network (team_id TEXT NOT NULL, region TEXT NOT NULL, quarter INTEGER NOT NULL, charger_count INTEGER NOT NULL DEFAULT 0, charger_type TEXT NOT NULL CHECK (charger_type IN ('Level 2 AC', 'DC Fast Charge', 'Ultra-rapid 350kW')), installation_cost REAL NOT NULL DEFAULT 0, quarterly_maintenance REAL NOT NULL DEFAULT 0, demand_boost_pct REAL NOT NULL DEFAULT 0, UNIQUE (team_id, region, quarter))");
      if (method === "GET") {
        const rows = await env2.DB.prepare("SELECT * FROM charging_network WHERE team_id = ? AND quarter <= ? ORDER BY quarter, region").bind(teamId, quarter).all();
        return new Response(JSON.stringify({ investments: rows.results || [] }), { status: 200, headers: corsHeaders });
      }
      const typeConfig = { "Level 2 AC": [0.08, 0.12, 6e-3], "DC Fast Charge": [0.18, 0.35, 0.014], "Ultra-rapid 350kW": [0.3, 0.7, 0.025] };
      const investments = Array.isArray(body.investments) ? body.investments : [];
      if (!investments.length) return new Response(JSON.stringify({ error: "At least one regional investment is required." }), { status: 400, headers: corsHeaders });
      await env2.DB.batch(investments.map((investment) => {
        const region = String(investment.region || "").trim();
        const chargerType = String(investment.charger_type || "");
        const count3 = Math.max(0, Math.floor(Number(investment.charger_count) || 0));
        const config2 = typeConfig[chargerType];
        if (!region || !config2) throw new Error("Each investment needs a valid region and charger type.");
        return env2.DB.prepare("INSERT INTO charging_network (team_id, region, quarter, charger_count, charger_type, installation_cost, quarterly_maintenance, demand_boost_pct) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(team_id, region, quarter) DO UPDATE SET charger_count = excluded.charger_count, charger_type = excluded.charger_type, installation_cost = excluded.installation_cost, quarterly_maintenance = excluded.quarterly_maintenance, demand_boost_pct = excluded.demand_boost_pct").bind(teamId, region, quarter, count3, chargerType, count3 * config2[1], count3 * config2[2], count3 * config2[0]);
      }));
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/strategy-plans" && method === "GET") {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding DB is not configured." }), { status: 500, headers: corsHeaders });
      const universeId = String(url.searchParams.get("universeId") || "").trim();
      const teamId = Number(url.searchParams.get("teamId"));
      const quarter = Number(url.searchParams.get("quarter"));
      if (!universeId || !Number.isInteger(teamId) || !Number.isInteger(quarter) || quarter < 1) return new Response(JSON.stringify({ error: "universeId, teamId, and a positive integer quarter are required." }), { status: 400, headers: corsHeaders });
      const row = await env2.DB.prepare("SELECT * FROM strategy_plans WHERE universe_id = ? AND team_i = ? AND quarter = ?").bind(universeId, teamId, quarter).first();
      return new Response(JSON.stringify({ plan: row ? JSON.parse(row.plan_json) : null, updatedAt: row?.updated_at || null }), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/strategy-plans" && method === "POST") {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const body = await request.json();
      const universeId = String(body.universeId || "").trim();
      const teamId = Number(body.teamId);
      const quarter = Number(body.quarter);
      const plan = body.plan;
      const isDraft = Boolean(body.isDraft);
      if (!universeId || !Number.isInteger(teamId) || !Number.isInteger(quarter) || quarter < 1 || !plan || typeof plan !== "object") return new Response(JSON.stringify({ error: "universeId, teamId, quarter, and plan are required." }), { status: 400, headers: corsHeaders });
      if (!isDraft && String(plan.mission || "").trim().split(/\s+/).filter(Boolean).length > 200) return new Response(JSON.stringify({ error: "Mission exceeds 200 words." }), { status: 400, headers: corsHeaders });
      if (!isDraft) {
        const priorityTotal = ["Marketing", "Sales", "Manufacturing", "R&D", "Human Resources"].reduce((sum, name) => sum + Number(plan.priorities?.[name] || 0), 0);
        if (priorityTotal !== 100) return new Response(JSON.stringify({ error: "Functional priorities must total 100." }), { status: 400, headers: corsHeaders });
      }
      const id = `${universeId}:${teamId}:${quarter}`;
      await env2.DB.prepare("INSERT INTO strategy_plans (id, universe_id, team_i, quarter, plan_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(universe_id, team_i, quarter) DO UPDATE SET plan_json = excluded.plan_json, updated_at = datetime('now')").bind(id, universeId, teamId, quarter, JSON.stringify(plan)).run();
      return new Response(JSON.stringify({ success: true, id }), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/swot" && (method === "GET" || method === "POST")) {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const body = method === "POST" ? await request.json() : {};
      const universeId = String(body.universeId || url.searchParams.get("universeId") || "").trim();
      const teamId = Number(body.teamId ?? url.searchParams.get("teamId"));
      const quarter = Number(body.quarter ?? url.searchParams.get("quarter"));
      if (!universeId || !Number.isInteger(teamId) || !Number.isInteger(quarter) || quarter < 1) return new Response(JSON.stringify({ error: "universeId, teamId, and a positive integer quarter are required." }), { status: 400, headers: corsHeaders });
      await env2.DB.exec("CREATE TABLE IF NOT EXISTS swot_records (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i INTEGER NOT NULL, quarter INTEGER NOT NULL, swot_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter))");
      const universe = await env2.DB.prepare("SELECT id, game_state FROM universes WHERE id = ?").bind(universeId).first();
      if (!universe) return new Response(JSON.stringify({ error: "Simulation universe was not found." }), { status: 404, headers: corsHeaders });
      const state = readJson(universe.game_state);
      const teams = Array.isArray(state.teams) ? state.teams : [];
      const currentTeam = teams.find((team) => Number(team.i) === teamId);
      if (!currentTeam) return new Response(JSON.stringify({ error: "Team was not found in the simulation universe." }), { status: 404, headers: corsHeaders });
      const latest = /* @__PURE__ */ __name((team) => [...team.hist || []].filter((item) => Number(item.q) <= quarter).sort((a, b) => Number(b.q) - Number(a.q))[0] || {}, "latest");
      const number = /* @__PURE__ */ __name((value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback, "number");
      const teamResult = latest(currentTeam);
      const teamLabel = /* @__PURE__ */ __name((team) => String(team.name || `Team ${Number(team.i) + 1}`), "teamLabel");
      const segments = Array.isArray(state.segments) ? state.segments : [];
      const segmentName = /* @__PURE__ */ __name((id2) => segments.find((segment) => String(segment.id || segment.segment_id) === id2)?.name || id2, "segmentName");
      const judgmentEntries = Object.entries(teamResult.judg || {}).map(([id2, value]) => ({ id: id2, score: number(value?.p) })).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score);
      const scores = teams.map((team) => number(latest(team).brandJ)).filter((score) => score > 0);
      const adScores = teams.map((team) => number(latest(team).campJ)).filter((score) => score > 0);
      const averageBrandJudgment = scores.reduce((sum, score) => sum + score, 0) / (scores.length || 1);
      const averageAdJudgment = adScores.reduce((sum, score) => sum + score, 0) / (adScores.length || 1);
      const primary = String(currentTeam.prim || "");
      const primaryShare = number(teamResult.sharePrim || teamResult.share);
      const currentCash = number(teamResult.cash, number(currentTeam.cash));
      const negativeMarginBrands = (teamResult.modelRows || []).filter((model) => number(model.price) < number(model.cost)).map((model) => `${model.name || "Unnamed brand"} has an estimated negative unit margin`);
      const cityNetwork = ["Delhi / NCR", "Bengaluru / Chennai", "Mumbai / Pune", "Hyderabad", "Kolkata", "Ahmedabad"];
      const uncoveredCities = cityNetwork.slice(Math.max(0, Math.min(cityNetwork.length, number(currentTeam.centres)))).slice(0, 3);
      const uncontestedSegments = ["urban_commuter", "fleet_operator", "performance_enthusiast", "tech_pioneer", "eco_advocate"].filter((segmentId) => !teams.some((team) => number(latest(team).judg?.[segmentId]?.p) > 80)).map(segmentName);
      const actionSummary = /* @__PURE__ */ __name((team) => {
        const result = latest(team);
        const decision = team.dec || {};
        const actions = [];
        if (number(decision.ad) > 250 || number(result.campJ) >= 75) actions.push("aggressive demand generation");
        if (number(result.rndSpend) > 0 || (team.rnd || []).length > 0) actions.push("technology-led R&D investment");
        if (number(decision.newCentres) > 0 || number(team.centres) >= 6) actions.push("network expansion");
        if (number(result.reliab) >= 0.75 || number(team.qualityCum) > 0) actions.push("quality and reliability differentiation");
        if ((team.models || []).some((model) => number(model.price) >= 5e4)) actions.push("premium positioning");
        return actions.length ? actions.join(", ") : "measured, low-commitment posture";
      }, "actionSummary");
      const rivals = teams.filter((team) => Number(team.i) !== teamId).map((team) => ({ teamId: team.i, name: teamLabel(team), posture: actionSummary(team), evidence: { advertising: number(team.dec?.ad), rndSpend: number(latest(team).rndSpend), centres: number(team.centres), reliability: Math.round(number(latest(team).reliab) * 100) } }));
      const detected = {
        strengths: [...judgmentEntries.slice(0, 3).map((entry) => `${segmentName(entry.id)} brand judgment is ${Math.round(entry.score)}/100`), `Reliability rating is ${Math.round(number(teamResult.reliab) * 100)}/100`, `${Math.round(primaryShare * (primaryShare <= 1 ? 100 : 1))}% share in ${segmentName(primary)}`],
        weaknesses: [...negativeMarginBrands, ...currentCash < 1e3 ? [`Low cash position: Rs. ${Math.round(currentCash)} L`] : [], ...number(teamResult.campJ) > 0 && number(teamResult.campJ) < averageAdJudgment ? [`Ad judgment below the league average (${Math.round(teamResult.campJ)} vs ${Math.round(averageAdJudgment)})`] : []],
        opportunities: [...uncoveredCities.length ? [`Uncontested city coverage: ${uncoveredCities.join(", ")}`] : [], ...uncontestedSegments.length ? [`No team exceeds 80 brand judgment in: ${uncontestedSegments.join(", ")}`] : [], ...averageBrandJudgment ? [`League average brand judgment is ${Math.round(averageBrandJudgment)}/100`] : []],
        threats: teams.filter((team) => Number(team.i) !== teamId && (number(latest(team).rndSpend) > number(teamResult.rndSpend) || number(latest(team).reliab) > number(teamResult.reliab))).slice(0, 4).map((team) => `${teamLabel(team)} has superior ${number(latest(team).rndSpend) > number(teamResult.rndSpend) ? "R&D investment" : "reliability rating"}`)
      };
      const row = await env2.DB.prepare("SELECT swot_json, updated_at FROM swot_records WHERE universe_id = ? AND team_i = ? AND quarter = ?").bind(universeId, teamId, quarter).first();
      if (method === "GET") return new Response(JSON.stringify({ swot: row ? readJson(row.swot_json) : detected, detected, competitors: rivals, updatedAt: row?.updated_at || null }), { status: 200, headers: corsHeaders });
      const swot = body.swot;
      const quadrants = ["strengths", "weaknesses", "opportunities", "threats"];
      if (!swot || typeof swot !== "object" || quadrants.some((key) => !Array.isArray(swot[key]) || swot[key].some((item) => typeof item !== "string" || item.trim().length > 240))) return new Response(JSON.stringify({ error: "Each SWOT quadrant must be an array of text items no longer than 240 characters." }), { status: 400, headers: corsHeaders });
      const normalized = Object.fromEntries(quadrants.map((key) => [key, swot[key].map((item) => item.trim()).filter(Boolean).slice(0, 20)]));
      const id = `${universeId}:${teamId}:${quarter}`;
      await env2.DB.prepare("INSERT INTO swot_records (id, universe_id, team_i, quarter, swot_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(universe_id, team_i, quarter) DO UPDATE SET swot_json = excluded.swot_json, updated_at = datetime('now')").bind(id, universeId, teamId, quarter, JSON.stringify(normalized)).run();
      return new Response(JSON.stringify({ success: true, swot: normalized, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/balanced-scorecard" && method === "POST") {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const body = await request.json();
      const universeId = String(body.universeId || "").trim();
      const quarter = Number(body.quarter);
      const records = Array.isArray(body.records) ? body.records.slice(0, 100) : [];
      if (!universeId || !Number.isInteger(quarter) || quarter < 4 || !records.length) return new Response(JSON.stringify({ error: "universeId, Q4-or-later quarter, and scorecard records are required." }), { status: 400, headers: corsHeaders });
      await env2.DB.exec("CREATE TABLE IF NOT EXISTS balanced_scorecard (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i TEXT NOT NULL, quarter INTEGER NOT NULL, team_name TEXT NOT NULL, overall_score REAL NOT NULL, dimensions_json TEXT NOT NULL, raw_metrics_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter))");
      await env2.DB.batch(records.map((record) => {
        const teamId = String(record.teamId || "").trim();
        const id = `${universeId}:${teamId}:${quarter}`;
        return env2.DB.prepare("INSERT INTO balanced_scorecard (id, universe_id, team_i, quarter, team_name, overall_score, dimensions_json, raw_metrics_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(universe_id, team_i, quarter) DO UPDATE SET team_name = excluded.team_name, overall_score = excluded.overall_score, dimensions_json = excluded.dimensions_json, raw_metrics_json = excluded.raw_metrics_json, updated_at = datetime('now')").bind(id, universeId, teamId, quarter, String(record.teamName || teamId), Number(record.score) || 0, JSON.stringify(record.dimensions || {}), JSON.stringify(record.raw || {}));
      }));
      return new Response(JSON.stringify({ success: true, quarter, saved: records.length }), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/balanced-scorecard/export" && method === "GET") {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const universeId = String(url.searchParams.get("universe_id") || "").trim();
      const quarter = Number(url.searchParams.get("quarter"));
      if (!universeId || !Number.isInteger(quarter) || quarter < 1) return new Response(JSON.stringify({ error: "universe_id and a positive integer quarter are required." }), { status: 400, headers: corsHeaders });
      const rows = await env2.DB.prepare(
        "SELECT u.name AS student_name, u.email AS email, b.team_name AS team_name, b.team_i AS team_index, b.quarter AS quarter, b.overall_score AS overall_score, b.dimensions_json AS dimensions_json FROM balanced_scorecard b JOIN users u ON u.universe_id = b.universe_id AND CAST(u.team_i AS TEXT) = b.team_i WHERE b.universe_id = ? AND b.quarter = ? ORDER BY b.team_i, u.name"
      ).bind(universeId, quarter).all();
      const records = rows.results || [];
      const csvEscape = /* @__PURE__ */ __name((value) => {
        const str = value === null || value === void 0 ? "" : String(value);
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      }, "csvEscape");
      const columns = ["Student Name", "Email", "Team Name", "Team Index", "Quarter", "BSC Total Score", "Financial Performance", "Financial Risk", "Market Performance", "Marketing Effectiveness", "Investment in Future", "Wealth Creation", "Asset Management", "HR Management", "Manufacturing Productivity"];
      const lines = [columns.join(",")];
      for (const row of records) {
        const dims = readJson(row.dimensions_json);
        const values = [
          row.student_name,
          row.email,
          row.team_name,
          row.team_index,
          row.quarter,
          Number(row.overall_score ?? 0).toFixed(1),
          Number(dims.financialPerformance ?? 0).toFixed(2),
          Number(dims.financialRisk ?? 0).toFixed(2),
          Number(dims.marketPerformance ?? 0).toFixed(2),
          Number(dims.marketingEffectiveness ?? 0).toFixed(2),
          Number(dims.investmentFuture ?? 0).toFixed(2),
          Number(dims.wealthCreation ?? 0).toFixed(2),
          Number(dims.assetManagement ?? 0).toFixed(2),
          Number(dims.hrManagement ?? 0).toFixed(2),
          Number(dims.manufacturingProductivity ?? 0).toFixed(2)
        ];
        lines.push(values.map(csvEscape).join(","));
      }
      const csv = lines.join("\n");
      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="BSC_Q${quarter}_${universeId}.csv"`
        }
      });
    }
    if (path === "/api/d1/status" || path === "/api/d1/health") {
      if (!env2.DB) {
        return new Response(
          JSON.stringify({ status: "disconnected", error: "D1 database binding 'DB' is not configured in environment." }),
          { status: 200, headers: corsHeaders }
        );
      }
      try {
        const univCount = await env2.DB.prepare("SELECT COUNT(*) as count FROM universes").first("count");
        const userCount = await env2.DB.prepare("SELECT COUNT(*) as count FROM users").first("count");
        return new Response(
          JSON.stringify({
            status: "connected",
            provider: "Cloudflare D1",
            tableCounts: { universes: univCount ?? 0, users: userCount ?? 0 }
          }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ status: "uninitialized", error: err.message || "Tables not yet initialized." }),
          { status: 200, headers: corsHeaders }
        );
      }
    }
    if (path === "/api/d1/init-schema" && method === "POST") {
      if (!env2.DB) {
        return new Response(JSON.stringify({ error: "No D1 DB binding found" }), { status: 500, headers: corsHeaders });
      }
      const initStatements = [
        "CREATE TABLE IF NOT EXISTS universes (id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT NOT NULL, instructor_email TEXT NOT NULL, max_teams INTEGER NOT NULL DEFAULT 10, max_members_per_team INTEGER NOT NULL DEFAULT 8, game_state TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))",
        "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, institution TEXT DEFAULT '', universe_id TEXT NOT NULL, team_i INTEGER NOT NULL DEFAULT -1, password TEXT NOT NULL, last_active_at TEXT, active_minutes INTEGER NOT NULL DEFAULT 0, is_online INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
        "CREATE TABLE IF NOT EXISTS team_decisions (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i INTEGER NOT NULL, quarter INTEGER NOT NULL, decision_json TEXT NOT NULL, redesign_fee REAL NOT NULL DEFAULT 0, submitted_at TEXT NOT NULL DEFAULT (datetime('now')), submitted_by TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS decision_audit_log (log_id TEXT PRIMARY KEY, team_id TEXT, quarter INTEGER, decision_area TEXT, field_changed TEXT, old_value TEXT, new_value TEXT, timestamp TEXT)",
        "CREATE INDEX IF NOT EXISTS idx_decision_audit_team_quarter ON decision_audit_log(team_id, quarter, timestamp)",
        "CREATE TABLE IF NOT EXISTS strategy_plans (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i INTEGER NOT NULL, quarter INTEGER NOT NULL, plan_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter))",
        "CREATE TABLE IF NOT EXISTS pro_forma_statements (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i INTEGER NOT NULL, quarter INTEGER NOT NULL, statement_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter))",
        "CREATE INDEX IF NOT EXISTS idx_pro_forma_lookup ON pro_forma_statements(universe_id, quarter, team_i)",
        "CREATE TABLE IF NOT EXISTS balanced_scorecard (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i TEXT NOT NULL, quarter INTEGER NOT NULL, team_name TEXT NOT NULL, overall_score REAL NOT NULL, dimensions_json TEXT NOT NULL, raw_metrics_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter))",
        "CREATE INDEX IF NOT EXISTS idx_balanced_scorecard_lookup ON balanced_scorecard(universe_id, quarter, team_i)",
        "CREATE TABLE IF NOT EXISTS hr_decisions (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, team_i INTEGER NOT NULL, quarter INTEGER NOT NULL, sales_json TEXT NOT NULL, production_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (universe_id, team_i, quarter))",
        "CREATE INDEX IF NOT EXISTS idx_hr_decisions_lookup ON hr_decisions(universe_id, quarter, team_i)",
        "CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, universe_id TEXT NOT NULL, user_id TEXT NOT NULL, action TEXT NOT NULL, details_json TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
        "CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')))",
        "CREATE TABLE IF NOT EXISTS market_segments (segment_id TEXT PRIMARY KEY, name TEXT, description TEXT, price_sensitivity INTEGER, range_priority INTEGER, charging_speed_priority INTEGER, autonomy_priority INTEGER, brand_image_priority INTEGER, typical_buyer_persona TEXT, segment_size_pct REAL)",
        "CREATE TABLE IF NOT EXISTS vehicle_components (component_id TEXT PRIMARY KEY, category TEXT, name TEXT, material_cost REAL, performance_score INTEGER, benefit_delivered TEXT, is_rd_unlocked INTEGER DEFAULT 0, available_from_quarter INTEGER DEFAULT 1)",
        "CREATE TABLE IF NOT EXISTS ad_campaigns (campaign_id TEXT PRIMARY KEY, universe_id TEXT, team_id TEXT, quarter INTEGER, segment_target TEXT, brand_mentioned TEXT, benefit_1 TEXT, benefit_2 TEXT, benefit_3 TEXT, benefit_4 TEXT, benefit_5 TEXT, ad_judgment INTEGER)",
        "CREATE TABLE IF NOT EXISTS ad_violations (violation_id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, universe_id TEXT NOT NULL, team_id TEXT NOT NULL, claim TEXT NOT NULL, quarter INTEGER NOT NULL, offense_number INTEGER NOT NULL, penalty_type TEXT NOT NULL, fine_pct REAL NOT NULL DEFAULT 0, fine_amount REAL NOT NULL DEFAULT 0, ban_until_quarter INTEGER NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))"
      ];
      for (const statement of initStatements) await env2.DB.exec(statement);
      return new Response(JSON.stringify({ success: true, message: "D1 Schema successfully initialized." }), {
        status: 200,
        headers: corsHeaders
      });
    }
    if (path === "/api/d1/universes") {
      if (method === "GET") {
        const { results } = await env2.DB.prepare("SELECT * FROM universes ORDER BY created_at DESC").all();
        const universes = (results || []).map((row) => ({
          id: row.id,
          name: row.name,
          code: row.code,
          instructorEmail: row.instructor_email,
          maxTeams: row.max_teams,
          maxMembersPerTeam: row.max_members_per_team,
          gameState: typeof row.game_state === "string" ? JSON.parse(row.game_state) : row.game_state,
          createdAt: row.created_at
        }));
        return new Response(JSON.stringify(universes), { status: 200, headers: corsHeaders });
      }
      if (method === "POST") {
        const universe = await request.json();
        await env2.DB.prepare(`
          INSERT INTO universes (id, name, code, instructor_email, max_teams, max_members_per_team, game_state, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            code = excluded.code,
            instructor_email = excluded.instructor_email,
            max_teams = excluded.max_teams,
            max_members_per_team = excluded.max_members_per_team,
            game_state = excluded.game_state,
            updated_at = datetime('now')
        `).bind(
          universe.id,
          universe.name,
          universe.code || "NITW2026",
          universe.instructorEmail || "instructor@nitw.ac.in",
          universe.maxTeams || 10,
          universe.maxMembersPerTeam || 8,
          JSON.stringify(universe.gameState)
        ).run();
        return new Response(JSON.stringify({ success: true, universeId: universe.id }), { status: 200, headers: corsHeaders });
      }
    }
    if (path === "/api/d1/pro-forma-statements" && method === "POST") {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const body = await request.json();
      const universeId = String(body.universeId || "").trim();
      const teamI = Number(body.teamI);
      const quarter = Number(body.quarter);
      if (!universeId || !Number.isInteger(teamI) || !Number.isInteger(quarter) || !body.statement) {
        return new Response(JSON.stringify({ error: "universeId, teamI, quarter, and statement are required." }), { status: 400, headers: corsHeaders });
      }
      const id = `pro-forma:${universeId}:${teamI}:Q${quarter}`;
      await env2.DB.prepare(`
        INSERT INTO pro_forma_statements (id, universe_id, team_i, quarter, statement_json, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(universe_id, team_i, quarter) DO UPDATE SET statement_json = excluded.statement_json, updated_at = datetime('now')
      `).bind(id, universeId, teamI, quarter, JSON.stringify(body.statement)).run();
      return new Response(JSON.stringify({ success: true, id }), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/d1/users") {
      if (method === "GET") {
        const { results } = await env2.DB.prepare("SELECT * FROM users ORDER BY name ASC").all();
        const users = (results || []).map((row) => ({
          id: row.id,
          email: row.email,
          name: row.name,
          role: row.role,
          institution: row.institution,
          universeId: row.universe_id,
          teamI: row.team_i,
          password: row.password,
          lastActiveAt: row.last_active_at,
          activeMinutes: row.active_minutes,
          isOnline: Boolean(row.is_online)
        }));
        return new Response(JSON.stringify(users), { status: 200, headers: corsHeaders });
      }
      if (method === "POST") {
        const user = await request.json();
        await env2.DB.prepare(`
          INSERT INTO users (id, email, name, role, institution, universe_id, team_i, password, last_active_at, active_minutes, is_online)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            email = excluded.email,
            name = excluded.name,
            role = excluded.role,
            institution = excluded.institution,
            universe_id = excluded.universe_id,
            team_i = excluded.team_i,
            password = excluded.password,
            last_active_at = excluded.last_active_at,
            active_minutes = excluded.active_minutes,
            is_online = excluded.is_online
        `).bind(
          user.id,
          user.email,
          user.name,
          user.role,
          user.institution || "",
          user.universeId,
          user.teamI ?? -1,
          user.password || "student123",
          user.lastActiveAt || (/* @__PURE__ */ new Date()).toISOString(),
          user.activeMinutes || 0,
          user.isOnline ? 1 : 0
        ).run();
        return new Response(JSON.stringify({ success: true, userId: user.id }), { status: 200, headers: corsHeaders });
      }
    }
    if (path.startsWith("/api/d1/users/") && !path.endsWith("/batch") && !path.endsWith("/remove-from-universe") && method === "DELETE") {
      const segments = path.split("/").filter(Boolean);
      const userId = decodeURIComponent(segments[segments.length - 1]);
      const email = url.searchParams.get("email") || "";
      let deletedCount = 0;
      const result = await env2.DB.prepare(
        `DELETE FROM users WHERE id = ? OR email = ? OR LOWER(id) = LOWER(?) OR LOWER(email) = LOWER(?)`
      ).bind(userId, userId, userId, userId).run();
      deletedCount += Number(result?.meta?.changes || 0);
      if (email) {
        const emailResult = await env2.DB.prepare(
          `DELETE FROM users WHERE id = ? OR email = ? OR LOWER(id) = LOWER(?) OR LOWER(email) = LOWER(?)`
        ).bind(email, email, email, email).run();
        deletedCount += Number(emailResult?.meta?.changes || 0);
      }
      return new Response(JSON.stringify({ success: deletedCount > 0, deletedId: userId, email, deletedCount }), {
        status: deletedCount > 0 ? 200 : 404,
        headers: corsHeaders
      });
    }
    if (path.startsWith("/api/d1/universes/") && method === "DELETE") {
      const segments = path.split("/").filter(Boolean);
      const universeId = decodeURIComponent(segments[segments.length - 1]);
      await env2.DB.prepare("DELETE FROM universes WHERE id = ?").bind(universeId).run();
      return new Response(JSON.stringify({ success: true, deletedId: universeId }), {
        status: 200,
        headers: corsHeaders
      });
    }
    if (path.endsWith("/remove-from-universe") && method === "POST") {
      const segments = path.split("/").filter(Boolean);
      const userId = decodeURIComponent(segments[segments.length - 2]);
      await env2.DB.prepare(
        `UPDATE users SET universe_id = '', team_i = -1 WHERE id = ?`
      ).bind(userId).run();
      return new Response(JSON.stringify({ success: true, userId }), {
        status: 200,
        headers: corsHeaders
      });
    }
    if (path === "/api/d1/users/batch" && method === "POST") {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const { users } = await request.json();
      if (Array.isArray(users)) {
        const statements = users.map(
          (u) => env2.DB.prepare(`
            INSERT INTO users (id, email, name, role, institution, universe_id, team_i, password, last_active_at, active_minutes, is_online)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              email = excluded.email,
              name = excluded.name,
              role = excluded.role,
              institution = excluded.institution,
              universe_id = excluded.universe_id,
              team_i = excluded.team_i,
              password = excluded.password,
              last_active_at = excluded.last_active_at,
              active_minutes = excluded.active_minutes,
              is_online = excluded.is_online
          `).bind(
            u.id,
            u.email,
            u.name,
            u.role,
            u.institution || "",
            u.universeId,
            u.teamI ?? -1,
            u.password || "student123",
            u.lastActiveAt || (/* @__PURE__ */ new Date()).toISOString(),
            u.activeMinutes || 0,
            u.isOnline ? 1 : 0
          )
        );
        await env2.DB.batch(statements);
      }
      return new Response(JSON.stringify({ success: true, count: users?.length || 0 }), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/d1/query" && method === "POST") {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const { sql, params = [] } = await request.json();
      if (!sql || typeof sql !== "string") {
        return new Response(JSON.stringify({ error: "No SQL provided" }), { status: 400, headers: corsHeaders });
      }
      const trimmed = sql.trim().toLowerCase();
      if (trimmed.startsWith("select") || trimmed.startsWith("pragma") || trimmed.startsWith("explain")) {
        const { results } = await env2.DB.prepare(sql).bind(...params).all();
        return new Response(JSON.stringify({ success: true, results, rows: results?.length || 0 }), {
          status: 200,
          headers: corsHeaders
        });
      } else {
        const info3 = await env2.DB.prepare(sql).bind(...params).run();
        return new Response(JSON.stringify({ success: true, meta: info3?.meta, changes: info3?.meta?.changes || 0 }), {
          status: 200,
          headers: corsHeaders
        });
      }
    }
    if (path === "/api/production-schedules" && method === "POST") {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const body = await request.json();
      const universeId = String(body.universeId || "").trim();
      const teamI = Number(body.teamId);
      const quarter = Number(body.quarter);
      if (!universeId || !Number.isInteger(teamI) || !Number.isInteger(quarter) || quarter < 1 || !body.inputs || !body.outputs) {
        return new Response(JSON.stringify({ error: "universeId, teamId, quarter, inputs, and outputs are required." }), { status: 400, headers: corsHeaders });
      }
      const scheduleId = `${universeId}:${teamI}:${quarter}`;
      await env2.DB.prepare(`INSERT INTO production_schedules (schedule_id, universe_id, team_i, quarter, inputs_json, outputs_json)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(universe_id, team_i, quarter) DO UPDATE SET inputs_json = excluded.inputs_json, outputs_json = excluded.outputs_json, updated_at = datetime('now')`).bind(scheduleId, universeId, teamI, quarter, JSON.stringify(body.inputs), JSON.stringify(body.outputs)).run();
      return new Response(JSON.stringify({ success: true, scheduleId }), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/production-schedules" && method === "GET") {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const universeId = String(url.searchParams.get("universeId") || "").trim();
      const teamI = Number(url.searchParams.get("teamId"));
      const quarter = Number(url.searchParams.get("quarter"));
      if (!universeId || !Number.isInteger(teamI) || !Number.isInteger(quarter)) {
        return new Response(JSON.stringify({ error: "universeId, teamId, and quarter are required." }), { status: 400, headers: corsHeaders });
      }
      const row = await env2.DB.prepare("SELECT * FROM production_schedules WHERE universe_id = ? AND team_i = ? AND quarter = ?").bind(universeId, teamI, quarter).first();
      if (!row) return new Response(JSON.stringify({ error: "Schedule not found." }), { status: 404, headers: corsHeaders });
      return new Response(JSON.stringify({ ...row, inputs: JSON.parse(row.inputs_json), outputs: JSON.parse(row.outputs_json) }), { status: 200, headers: corsHeaders });
    }
    if (path.startsWith("/api/ad-campaigns/") && path.endsWith("/validate") && method === "POST") {
      const campaignId = decodeURIComponent(path.split("/").filter(Boolean).slice(-2, -1)[0] || "");
      const body = await request.json();
      const teamId = String(body.teamId || "").trim();
      const quarter = Number(body.quarter);
      if (!campaignId || !teamId || !Number.isInteger(quarter) || quarter < 1) {
        return new Response(JSON.stringify({ error: "campaignId, teamId, and a positive integer quarter are required." }), { status: 400, headers: corsHeaders });
      }
      const validation = await validateAdClaims(campaignId, teamId, quarter, env2.DB);
      return new Response(JSON.stringify(validation), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/ad-tribunal") {
      await env2.DB.exec(`CREATE TABLE IF NOT EXISTS ad_campaigns (campaign_id TEXT PRIMARY KEY, universe_id TEXT, team_id TEXT, quarter INTEGER, segment_target TEXT, brand_mentioned TEXT, benefit_1 TEXT, benefit_2 TEXT, benefit_3 TEXT, benefit_4 TEXT, benefit_5 TEXT, ad_judgment INTEGER); CREATE TABLE IF NOT EXISTS ad_violations (violation_id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, universe_id TEXT NOT NULL, team_id TEXT NOT NULL, claim TEXT NOT NULL, quarter INTEGER NOT NULL, offense_number INTEGER NOT NULL DEFAULT 0, penalty_type TEXT NOT NULL DEFAULT 'pending', fine_pct REAL NOT NULL DEFAULT 0, fine_amount REAL NOT NULL DEFAULT 0, ban_until_quarter INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
      await env2.DB.exec(`CREATE TABLE IF NOT EXISTS ad_claim_bans (ban_id TEXT PRIMARY KEY, violation_id TEXT NOT NULL UNIQUE, universe_id TEXT NOT NULL, team_id TEXT NOT NULL, claim TEXT NOT NULL, offense_number INTEGER NOT NULL, ban_start_quarter INTEGER NOT NULL, ban_until_quarter INTEGER NOT NULL, fine_pct REAL NOT NULL DEFAULT 0, fine_amount REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
      for (const statement of [
        "ALTER TABLE ad_violations ADD COLUMN plaintiff_team_id TEXT",
        "ALTER TABLE ad_violations ADD COLUMN defendant_response TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE ad_violations ADD COLUMN ruling TEXT",
        "ALTER TABLE ad_violations ADD COLUMN ruled_at TEXT",
        "ALTER TABLE ad_violations ADD COLUMN ruling_document TEXT"
      ]) {
        try {
          await env2.DB.exec(statement);
        } catch {
        }
      }
      const universeId = String(url.searchParams.get("universe_id") || "").trim();
      if (method === "GET") {
        const quarter = Number(url.searchParams.get("quarter"));
        if (!universeId || !Number.isInteger(quarter) || quarter < 1) return new Response(JSON.stringify({ error: "universe_id and a positive integer quarter are required." }), { status: 400, headers: corsHeaders });
        const universe2 = await env2.DB.prepare("SELECT game_state FROM universes WHERE id = ?").bind(universeId).first();
        const state2 = readJson(universe2?.game_state);
        const teamName2 = /* @__PURE__ */ __name((teamId) => (state2.teams || []).find((team2) => String(team2.i) === teamId || String(team2.id) === teamId)?.name || teamId, "teamName");
        const rows = await env2.DB.prepare(`SELECT v.*, c.segment_target, c.brand_mentioned, c.benefit_1, c.benefit_2, c.benefit_3, c.benefit_4, c.benefit_5
          FROM ad_violations v LEFT JOIN ad_campaigns c ON c.campaign_id = v.campaign_id
          WHERE v.universe_id = ? AND v.quarter = ? ORDER BY v.created_at DESC`).bind(universeId, quarter).all();
        const complaints = (rows.results || []).map((row) => ({
          ...row,
          plaintiff_team: teamName2(String(row.plaintiff_team_id || "Market Integrity Office")),
          defendant_team: teamName2(String(row.team_id)),
          evidence: { campaignId: row.campaign_id, segmentTarget: row.segment_target, brandMentioned: row.brand_mentioned, claimedBenefits: [row.benefit_1, row.benefit_2, row.benefit_3, row.benefit_4, row.benefit_5].filter(Boolean), validationReason: row.reason },
          defendant_response: row.defendant_response || "No response filed.",
          ruling: row.ruling || "pending"
        }));
        return new Response(JSON.stringify({ complaints, quarter }), { status: 200, headers: corsHeaders });
      }
      if (method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
      const body = await request.json();
      const ruling = String(body.ruling || "").toLowerCase();
      const bodyUniverseId = String(body.universe_id || universeId).trim();
      if (!bodyUniverseId || !body.violation_id || !["guilty", "not guilty"].includes(ruling)) return new Response(JSON.stringify({ error: "universe_id, violation_id, and ruling (Guilty or Not Guilty) are required." }), { status: 400, headers: corsHeaders });
      const violation = await env2.DB.prepare("SELECT * FROM ad_violations WHERE violation_id = ? AND universe_id = ?").bind(String(body.violation_id), bodyUniverseId).first();
      if (!violation) return new Response(JSON.stringify({ error: "Complaint not found." }), { status: 404, headers: corsHeaders });
      if (violation.ruling) return new Response(JSON.stringify({ success: true, ruling: violation.ruling, document: violation.ruling_document, alreadyRuled: true }), { status: 200, headers: corsHeaders });
      const prior = await env2.DB.prepare("SELECT COUNT(*) AS count FROM ad_violations WHERE universe_id = ? AND team_id = ? AND claim = ? AND ruling = 'guilty'").bind(bodyUniverseId, violation.team_id, violation.claim).first("count");
      const offenseNumber = Number(prior || 0) + 1;
      const finePct = offenseNumber === 2 ? 0.05 : offenseNumber >= 3 ? Math.min(0.2, 0.1 * Math.pow(2, offenseNumber - 3)) : 0;
      const universe = await env2.DB.prepare("SELECT game_state FROM universes WHERE id = ?").bind(bodyUniverseId).first();
      const state = readJson(universe?.game_state);
      const team = (state.teams || []).find((item) => String(item.i) === String(violation.team_id) || String(item.id) === String(violation.team_id));
      const revenue = Number(team?.revenue || team?.financials?.revenue || team?.cumRevenue || 0);
      const fineAmount = revenue * finePct;
      const banUntil = Number(violation.quarter) + 4;
      const teamName = team?.name || violation.team_id;
      const document = `To: ${state.instructorEmail || "Instructor"}
Subject: Ad Claims Tribunal Ruling - ${teamName} - Q${violation.quarter}

The Ad Claims Tribunal has ruled ${ruling === "guilty" ? "GUILTY" : "NOT GUILTY"} in the complaint concerning the claim "${violation.claim}".

Plaintiff: ${violation.plaintiff_team_id || "Market Integrity Office"}
Defendant: ${teamName}
Evidence: Campaign ${violation.campaign_id}; ${violation.reason}
Defendant response: ${violation.defendant_response || "No response filed."}

${ruling === "guilty" ? `Penalty: ${finePct ? `${finePct * 100}% revenue fine (Rs. ${fineAmount.toFixed(2)}) and ` : ""}four-quarter claim ban through Q${banUntil}.` : "No penalty applies."}

Regards,
Ad Claims Tribunal`;
      await env2.DB.batch([
        env2.DB.prepare("UPDATE ad_violations SET ruling = ?, ruled_at = datetime('now'), offense_number = ?, fine_pct = ?, fine_amount = ?, ban_until_quarter = ?, penalty_type = ?, ruling_document = ? WHERE violation_id = ? AND ruling IS NULL").bind(ruling, ruling === "guilty" ? offenseNumber : 0, finePct, fineAmount, ruling === "guilty" ? banUntil : 0, ruling === "guilty" ? finePct ? "fine_and_ban" : "ban" : "none", document, violation.violation_id),
        ...ruling === "guilty" ? [env2.DB.prepare("INSERT INTO ad_claim_bans (ban_id, violation_id, universe_id, team_id, claim, offense_number, ban_start_quarter, ban_until_quarter, fine_pct, fine_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(`ban:${violation.violation_id}`, violation.violation_id, bodyUniverseId, violation.team_id, violation.claim, offenseNumber, violation.quarter, banUntil, finePct, fineAmount)] : []
      ]);
      if (ruling === "guilty" && team && fineAmount > 0) {
        team.cash = Math.max(0, Number(team.cash || 0) - fineAmount);
        await env2.DB.prepare("UPDATE universes SET game_state = ?, updated_at = datetime('now') WHERE id = ?").bind(JSON.stringify(state), bodyUniverseId).run();
      }
      return new Response(JSON.stringify({ success: true, ruling, offenseNumber, finePct, fineAmount, banUntil, document }), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/ad-violations" && method === "GET") {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const universeId = url.searchParams.get("universe_id");
      const query = universeId ? "SELECT * FROM ad_violations WHERE universe_id = ? ORDER BY created_at DESC" : "SELECT * FROM ad_violations ORDER BY created_at DESC";
      const rows = await env2.DB.prepare(query).bind(...universeId ? [universeId] : []).all();
      return new Response(JSON.stringify({ violations: rows.results || [] }), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/executive-briefing" && method === "POST") {
      if (!env2.DB) return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured." }), { status: 500, headers: corsHeaders });
      const apiKey = env2.ANTHROPIC_API_KEY;
      if (!apiKey) return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), { status: 400, headers: corsHeaders });
      const body = await request.json();
      const universeId = String(body.universeId || "").trim();
      const teamId = Number(body.teamId);
      const quarter = Number(body.quarter);
      const role = String(body.role || "President").trim();
      if (!universeId || !Number.isInteger(teamId) || !Number.isInteger(quarter) || quarter < 1) {
        return new Response(JSON.stringify({ error: "universeId, teamId, and a positive integer quarter are required." }), { status: 400, headers: corsHeaders });
      }
      const readJson2 = /* @__PURE__ */ __name((value) => {
        try {
          return typeof value === "string" ? JSON.parse(value) : value || {};
        } catch {
          return {};
        }
      }, "readJson");
      const rows = /* @__PURE__ */ __name(async (sql, ...params) => {
        try {
          const result = await env2.DB.prepare(sql).bind(...params).all();
          return result.results || [];
        } catch {
          return [];
        }
      }, "rows");
      const scorecards = (await rows("SELECT quarter, overall_score, dimensions_json, raw_metrics_json FROM balanced_scorecard WHERE universe_id = ? AND team_i = ? AND quarter IN (?, ?) ORDER BY quarter", universeId, String(teamId), quarter - 1, quarter)).map((row) => ({ ...row, dimensions: readJson2(row.dimensions_json), rawMetrics: readJson2(row.raw_metrics_json) }));
      const strategyPlans = (await rows("SELECT quarter, plan_json, updated_at FROM strategy_plans WHERE universe_id = ? AND team_i = ? AND quarter IN (?, ?, ?) ORDER BY quarter", universeId, teamId, quarter - 1, quarter, quarter + 1)).map((row) => ({ quarter: row.quarter, updatedAt: row.updated_at, plan: readJson2(row.plan_json) }));
      const proForma = (await rows("SELECT quarter, statement_json, updated_at FROM pro_forma_statements WHERE universe_id = ? AND team_i = ? AND quarter IN (?, ?) ORDER BY quarter", universeId, teamId, quarter, quarter + 1)).map((row) => ({ quarter: row.quarter, updatedAt: row.updated_at, statement: readJson2(row.statement_json) }));
      const decisions = (await rows("SELECT quarter, decision_json, submitted_at, submitted_by FROM team_decisions WHERE universe_id = ? AND team_i = ? AND quarter <= ? ORDER BY quarter DESC, submitted_at DESC LIMIT 20", universeId, teamId, quarter)).map((row) => ({ quarter: row.quarter, submittedAt: row.submitted_at, submittedBy: row.submitted_by, decision: readJson2(row.decision_json) }));
      const sourceData = { universeId, teamId, quarter, role, scorecards, strategyPlans, proForma, decisions };
      const system = "You are a business consultant writing a concise executive summary for an instructor presentation in an EV venture simulation. Use only the supplied data; never invent metrics or decisions. Distinguish actual results from forecasts and call out missing data. Return valid JSON only with exactly these string fields: performance, decisions, nextQuarter, uncertainties. Each field must contain 1-2 polished paragraphs with no markdown headings or bullet lists.";
      const aiRes = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1400, system, messages: [{ role: "user", content: `Prepare the quarterly briefing for the ${role}.

D1 data:
${JSON.stringify(sourceData, null, 2)}` }] }) });
      if (!aiRes.ok) return new Response(JSON.stringify({ error: `Anthropic request failed (${aiRes.status}).` }), { status: 502, headers: corsHeaders });
      const aiData = await aiRes.json();
      const text = aiData?.content?.find((item) => item.type === "text")?.text || "{}";
      const parsed = readJson2(text.replace(/^```json\s*|\s*```$/g, ""));
      return new Response(JSON.stringify({ sourceData, sections: { performance: String(parsed.performance || "Performance data was retrieved, but no summary was generated."), decisions: String(parsed.decisions || "No decision rationale was available for this quarter."), nextQuarter: String(parsed.nextQuarter || "No next-quarter plan was available."), uncertainties: String(parsed.uncertainties || "No additional uncertainties were identified by the model.") } }), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/advisor" && method === "POST") {
      const apiKey = env2.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), { status: 400, headers: corsHeaders });
      }
      const { prompt, context: simContext } = await request.json();
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const systemInstruction = `You are an elite Business School Professor and Board of Directors Chairperson for the EV Venture League simulation. Analyze the student team metrics and provide 3 concise, highly actionable recommendations in markdown.`;
      const aiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${systemInstruction}

Context:
${JSON.stringify(simContext, null, 2)}

Query: ${prompt || "Analyze our current strategy."}`
                }
              ]
            }
          ]
        })
      });
      const aiData = await aiRes.json();
      const text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to generate advice at this moment.";
      return new Response(JSON.stringify({ advice: text }), { status: 200, headers: corsHeaders });
    }
    if (path === "/api/game-state/quarter" && method === "GET") {
      if (!env2.DB) return new Response(JSON.stringify({ quarter: 1 }), { status: 200, headers: corsHeaders });
      const universeId = String(url.searchParams.get("universe_id") || "").trim();
      if (!universeId) return new Response(JSON.stringify({ error: "universe_id is required." }), { status: 400, headers: corsHeaders });
      const row = await env2.DB.prepare("SELECT game_state, updated_at FROM universes WHERE id = ? LIMIT 1").bind(universeId).first();
      if (!row) return new Response(JSON.stringify({ error: "Simulation universe was not found." }), { status: 404, headers: corsHeaders });
      const quarter = Number(readJson(row.game_state)?.quarter) || 1;
      return new Response(JSON.stringify({ quarter, updatedAt: row.updated_at }), { status: 200, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ error: "Endpoint not found: " + path }), { status: 404, headers: corsHeaders });
  } catch (error3) {
    return new Response(JSON.stringify({ error: error3.message || "Server error" }), { status: 500, headers: corsHeaders });
  }
}
__name(onRequest, "onRequest");

// ../.wrangler/tmp/pages-gGvTa8/functionsRoutes-0.3866806621584479.mjs
var routes = [
  {
    routePath: "/api/:route*",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  }
];

// C:/Users/Admin/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count3 = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count3--;
          if (count3 === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count3++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count3)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// C:/Users/Admin/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env2, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context2 = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env: env2,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context2);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env2["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error3) {
      if (isFailOpen) {
        const response = await env2["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error3;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
