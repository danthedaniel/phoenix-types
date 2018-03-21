/**
 * Phoenix Channels JavaScript client.
 */
declare module "phoenix" {

/**
 * Phoenix data frame.
 */
interface Response<T> {
  status: string,

  /**
   * Payload.
   */
  response: T,
}

type PushStatus = "ok" | "error";

/**
 * A Push receive hook.
 */
interface RecHook {
  status: PushStatus,
  callback: (response: any) => void
}

/**
 * A data payload and response.
 */
class Push<TX, RX> {
  /**
   * Create a new Push.
   *
   * @param channel The Channel.
   * @param event   Event the push is for (e.g.: `"phx_join"`).
   * @param payload Data to send for the event.
   * @param timeout Duration to wait (in ms) before cancelling.
   */
  constructor(channel: Channel<any, any, any>, event: string, payload: null | TX, timeout: number);

  channel: Channel<any, any, any>;
  event: string;
  payload: TX | {};
  receivedResp?: Response<RX>;
  timeout: number;
  timeoutTimer: Timer;
  recHooks: RecHook[];
  sent: boolean;

  /**
   * Sends the Push again.
   *
   * @param timeout Duration to wait (in ms) before cancelling.
   */
  resend(timeout: number): void;

  /**
   * Send the payload.
   */
  send(): void;

  /**
   * Callback to execute for a given status.
   *
   * @param status   Status to respond to.
   * @param callback Function to execute on the matching status.
   * @return this.
   */
  receive(status: "ok", callback: (response: RX) => void): Push<TX, RX>;

  /**
   * Callback to execute for a given status.
   *
   * @param status   Status to respond to.
   * @param callback Function to execute on the matching status.
   * @return this.
   */
  receive(status: "error", callback: (response: any) => void): Push<TX, RX>;
}

type Ref = any;
type SocketTransport = LongPoll | WebSocket;

type ChannelCallback<T> = (payload: T, ref: Ref, joinRef: Ref) => any;
type ChannelState = "closed" | "errored" | "joined" | "joining" | "leaving";
interface ChannelBinding<T> {
  event: string;
  callback: ChannelCallback<T>
}

/**
 * A data channel.
 *
 * @template J  The join message type.
 * @template TX The transmitted data type.
 * @template RX The received data type.
 */
export class Channel<J, TX, RX> {
  /**
   * Create a new Channel.
   *
   * @param topic      Identifier for the channel.
   * @param joinParams Object sent to the channel during init (e.g.: auth token).
   * @param socket     The socket the channel is connected through.
   */
  constructor(topic: string, joinParams: J, socket: Socket<J>);

  /**
   * The join event parameters.
   */
  params: J;
  state: ChannelState;
  topic: string;
  socket: Socket<J>;
  bindings: ChannelBinding<RX>[];
  timeout: number;
  joinedOnce: boolean;
  joinPush: Push<J, RX>;
  pushBuffer: Push<TX, RX>[];
  rejoinTimer: Timer;

  rejoinUntilConnected(): void;

  /**
   * Create a "phx_join" Push.
   *
   * @param timeout Duration (in ms) to wait before cancelling.
   */
  join(timeout?: number): Push<J, RX>;

  /**
   * Convenience method. Equivalent to on("phx_close", callback).
   *
   * @param callback Function to invoke when the event is fired.
   */
  onClose(callback: ChannelCallback<RX>): void;

  /**
   * Convenience method. Equivalent to on("phx_error", callback).
   *
   * @param callback Function to invoke when the event is fired.
   */
  onError(callback: ChannelCallback<RX>): void;

  /**
   * Register an event handler.
   *
   * @param event    Event identifier.
   * @param callback Function to invoke when the event is emitted.
   */
  on(event: string, callback: ChannelCallback<RX>): void;

  /**
   * Remove all event handlers for a given event type.
   *
   * @param event Event identifier.
   */
  off(event: string): void;

  /**
   * Whether the channel can send data.
   */
  canPush(): boolean;

  /**
   * Send a payload to the server.
   *
   * @param event   Event identifier to send to the server.
   * @param payload Data to send.
   * @param timeout Duration (in ms) to wait before cancelling.
   * @return New Push object.
   */
  push(event: string, payload: TX, timeout?: number): Push<TX, RX>;

  /**
   * Leave the channel.
   * Unsubscribes from server events, and instructs channel to terminate on
   * server. Tiggers `onClose()` hooks.
   *
   * @param timeout Duration (in ms) to wait before cancelling.
   * @return New Push object.
   */
  leave(timeout?: number): Push<TX, RX>;

  /**
   * Overridable message hook.
   * Receives all events for specialized message handling before dispatching to
   * the channel callbacks. Must return the payload, modified or unmodified.
   *
   * @param event   Event identifier sent by the server to match on.
   * @param payload Data received from the server.
   * @param ref     Reference.
   * @return Transformed payload.
   */
  onMessage(event: string, payload: RX, ref?: Ref): any;

  isClosed(): boolean;
  isErrored(): boolean;
  isJoined(): boolean;
  isJoining(): boolean;
  isLeaving(): boolean;
}

/**
 * A socket-level data frame.
 * join ref, ref, topic, event, payload.
 */
type Msg = [Ref, Ref, string, string, {} | Response<any>];

type Encoder<T> = (msg: Msg, callback: (payload: string) => T) => T;
type Decoder<T> = (rawPayload: string, callback: (payload: Msg) => T) => T;

type SocketState = 0 | 1 | 2 | 3;
type SocketCallback = () => string;
type Logger = (kind: string, msg: string, data: any) => void;

/**
 * Options object for the Socket class.
 *
 * @template J The join message type.
 */
export interface SocketOpts<J> {
  /**
   * Default time (in ms) to wait before cancelling a request.
   */
  timeout?: number,

  /**
   * Transport type. Either WebSocket or LongPoll.
   */
  transport?: SocketTransport,

  /**
   * Message encoder.
   */
  encode?: Encoder<any>,

  /**
   * Message decoder.
   */
  decode?: Decoder<any>,

  /**
   * Number of ms between heartbeats (server ping).
   */
  heartbeatIntervalMs?: number,

  /**
   * Number of ms to wait before attempting a server reconnect.
   */
  reconnectAfterMs?: number,

  /**
   * Logger function.
   */
  logger?: Logger,

  /**
   * Default time (in ms) to wait before cancelling a request.
   */
  longpollerTimeout?: number,

  /**
   * Join params to send with each channel.
   */
  params?: J
}

/**
 * A WebSocket or LongPoll connection for multiple channels.
 *
 * @template J The join message type.
 */
export class Socket<J> {
  /**
   * Create a new Socket.
   *
   * @param endPoint URL to connect to.
   * @param opts     Configuration options.
   */
  constructor(endPoint: string, opts?: SocketOpts<J>);

  stateChangeCallbacks: {
    [key in "open" | "close" | "error" | "message"]: SocketCallback[]
  };
  channels: Channel<J, any, any>[];
  sendBuffer: SocketCallback[];
  ref: Ref;
  timeout: number;
  transport: SocketTransport;
  defaultEncoder: Encoder<string>;
  defaultDecoder: Decoder<any>;
  encode: Encoder<any>;
  decode: Decoder<any>;
  heartbeatIntervalMs: number;
  reconnectAfterMs: number | ((tries: number) => number);
  logger: Logger;
  longpollerTimeout: number;
  params: J;
  endPoint: string;
  heartbeatTimer?: Timer;
  pendingHeartbeatRef: Ref;
  reconnectTimer: Timer;
  conn?: SocketTransport;

  /**
   * Logs a message. Override `this.logger` for specialized logging.
   * noops by default.
   *
   * @param kind Log event name.
   * @param msg  Log message.
   * @param data Extra data to pass to the logger.
   */
  log: Logger;

  protocol(): "wss" | "ws";
  endPointURL(): string;

  disconnect(
    callback?: SocketCallback,
    code?: string | number,
    reason?: string
  ): void;

  /**
   * Connect to an endpoint.
   *
   * @param params The params to send when connecting
   */
  connect(params?: any): void;

  onOpen(callback: SocketCallback): void;
  onClose(callback: SocketCallback): void;
  onError(callback: SocketCallback): void;
  onMessage(callback: SocketCallback): void;

  onConnOpen(): void;
  onConnClose(event: string): void;
  onConnError(error: string): void;

  connectionState(): "connecting" | "open" | "closing" | "closed";
  isConnected(): boolean;

  /**
   * Remove a registered channel from the socket.
   *
   * @param channel Channel to remove.
   */
  remove(channel: Channel<J, any, any>): void;

  /**
   * Initiates a new channel for the given topic.
   *
   * @param topic      Identifier for the channel.
   * @param chanParams Paramaters for the channel
   * @returns A new Channel.
   */
  channel<TX, RX>(topic: string, chanParams?: any): Channel<J, TX, RX>;

  /**
   * Send a raw message.
   *
   * @param data Payload and channel identifier.
   */
  push(data: Msg): void;

  /**
   * Return the next message ref, accounting for overflows.
   * @return The next message ref.
   */
  makeRef(): string;

  sendHeartbeat(): void;
  flushSendBuffer(): void;
  onConnMessage(rawMessage: {data: any}): void;
}

/**
 * Backup communication protocol in case websockets can not be used.
 */
export class LongPoll {
  /**
   * Create a new LongPoll.
   *
   * @param endPoint URL to connect to.
   */
  constructor(endPoint: string);

  endPoint?: string;
  token?: string;
  skipHeartbeat: boolean;
  pollEndpoint: string;
  readyState: SocketState;

  onopen: () => void;
  onerror: () => void;
  onmessage: () => void;
  onclose: () => void;

  normalizeEndpoint(endPoint: string): string;
  endpointURL(): string;
  closeAndRetry(): void;
  ontimeout(): void;
  poll(): void;
  send(body: any): void;
  close(code: any, reason: string): void;
}

/**
 * A collection of AJAX helper methods.
 */
export class Ajax {
  /**
   * Make a request.
   */
  static request(
    method: string,
    endPoint: string,
    accept: string,
    body: string,
    timeout: number,
    ontimeout?: Function,
    callback?: Function
  ): void;

  /**
   * Make a cross-domain request.
   */
  static xdomainRequest(
    req: any,
    method: string,
    endPoint: string,
    body: string,
    timeout: number,
    ontimeout?: Function,
    callback?: Function
  ): void;

  /**
   * Make an XHR Request.
   */
  static xhrRequest(
    req: any,
    method: string,
    endPoint: string,
    accept: string,
    body: string,
    timeout: number,
    ontimeout?: Function,
    callback?: Function
  ): void;

  static parseJSON(resp: string): any;
  static serialize(obj: any, parentKey: string): string;

  /**
   * Add params to a URL.
   *
   * @param url    URL to augment.
   * @param params Params to append.
   * @returns New URL.
   */
  static appendParams(url: string, params: any): string;
}

export var Presence: {
  syncState: (
    currentState,
    newState,
    onJoin?: Function,
    onLeave?: Function
  ) => any,
  syncDiff: (
    currentState,
    presences: {joins: any[], leaves: any[]},
    onJOin?: Function,
    onLeave?: Function
  ) => any,
  list: (presences: any[], chooser?: (key, pres) => any) => any,
  map: (obj: object, func: (key, val) => any) => any[],
  clone: (obj: object) => any
}

/**
 * Creates a timer that accepts a timerCalc function to perform calculated
 * timeout retries, such as exponential backoff.
 */
class Timer {
  /**
   * Create a new Timer.
   *
   * @param callback  Function to call on each try.
   * @param timerCalc Function to mutate the timeout on each try.
   */
  constructor(callback: () => void, timerCalc: (tries: number) => number);

  callback: () => void;
  timerCalc: (tries: number) => void;

  /**
   * Identifier from setTimeout.
   */
  timer?: number;

  /**
   * Number of attempts made so far.
   */
  tries: number;

  /**
   * Clear the timeout and reset `tries` to 0.
   */
  reset(): void;

  /**
   * Cancels any previous scheduleTimeout and schedules callback.
   */
  scheduleTimeout(): void;
}
}
