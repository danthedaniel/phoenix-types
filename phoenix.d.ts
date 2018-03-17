declare module "phoenix" {

interface Response {
  status: string,
  response: any,
}

interface RecHook {
  status: any,
  callback: (response: any) => void
}

class Push {
  constructor(channel: Channel<any>, event: string, payload: null | any, timeout: number);

  channel: Channel<any>;
  event: string;
  receivedResp?: Response;
  timeout: number;
  timeoutTimer: Timer;
  recHooks: RecHook[];
  sent: boolean;

  resend(timeout: number): void;
  send(): void;
  receive(status: any, callback: (response: any) => void): Push;
}

type Ref = any;
type SocketTransport = LongPoll | WebSocket;

type ChannelCallback<T> = (payload: T, ref: Ref, joinRef: Ref) => any;
type ChannelState = "closed" | "errored" | "joined" | "joining" | "leaving";
type ChannelEvent = string;
interface ChannelBinding<T> {
  event: ChannelEvent;
  callback: ChannelCallback<T>
}

type ChannelParams = object;

export class Channel<T> {
  constructor(topic: string, params: null | ChannelParams, socket: Socket);

  state: ChannelState;
  topic: string;
  params: ChannelParams;
  socket: Socket;
  bindings: ChannelBinding<T>[];
  timeout: number;
  joinedOnce: boolean;
  joinPush: Push;
  pushBuffer: Push[];
  rejoinTimer: Timer;

  rejoinUntilConnected(): void;
  join(timeout?: number): Push;
  onClose(callback: ChannelCallback<T>): void;
  onError(callback: ChannelCallback<T>): void;
  on(event: ChannelEvent, callback: ChannelCallback<T>): void;
  off(event: ChannelEvent): void;
  canPush(): boolean;
  push(event: ChannelEvent, payload: any, timeout?: number): Push;
  leave(timeout?: number): Push;
  onMessage: (event: ChannelEvent, payload: T, ref?: Ref) => T
  isMember(topic: string, event: ChannelEvent, payload: any, joinRef?: Ref): boolean;
  joinRef(): Ref;
  sendJoin(timeout: number): void;
  rejoin(timeout?: number): void;
  trigger(event: ChannelEvent, payload: any, ref?: Ref, joinRef?: Ref): void;
  replyEventName(ref: Ref): string;

  isClosed(): boolean;
  isErrored(): boolean;
  isJoined(): boolean;
  isJoining(): boolean;
  isLeaving(): boolean;
}

interface Msg {
  join_ref: string;
  ref: Ref;
  topic: string;
  payload: any;
  event?: string
}

type Encoder<T> = (msg: Msg, callback: (payload: string) => T) => T;
type Decoder<T> = (rawPayload: string, callback: (payload: Msg) => T) => T;

type SocketState = 0 | 1 | 2 | 3;
type SocketCallback = () => string;
type Logger = (kind: string, msg: string, data: any) => void;

export interface SocketOpts {
  timeout?: number,
  transport?: SocketTransport,
  encode?: Encoder<any>,
  decode?: Decoder<any>,
  heartbeatIntervalMs?: number,
  reconnectAfterMs?: number,
  logger?: Logger,
  longpollerTimeout?: number,
  params?: ChannelParams
}

export class Socket {
  constructor(endPoint: string, opts?: SocketOpts);

  stateChangeCallbacks: {
    [key in "open" | "close" | "error" | "message"]: SocketCallback[]
  };
  channels: Channel<any>[];
  sendBuffer: SocketCallback[];
  ref: Ref;
  timeout: number;
  transport: SocketTransport;
  defaultEncoder: Encoder<string>;
  defaultDecoder: Encoder<any>;
  encode: Encoder<any>;
  decode: Encoder<any>;
  heartbeatIntervalMs: number;
  reconnectAfterMs: number | ((tries: number) => number);
  logger?: Logger;
  longpollerTimeout: number;
  params: any;
  endPoint: string;
  heartbeatTimer?: Timer;
  pendingHeartbeatRef: Ref;
  reconnectTimer: Timer;
  conn?: SocketTransport;

  protocol(): "wss" | "ws";
  endPointURL(): string;
  disconnect(
    callback?: SocketCallback,
    code?: string | number,
    reason?: string
  ): void;
  connect(params?: any): void;
  log: Logger;

  onOpen(callback: SocketCallback): void;
  onClose(callback: SocketCallback): void;
  onError(callback: SocketCallback): void;
  onMessage(callback: SocketCallback): void;

  onConnOpen(): void;
  onConnClose(event: string): void;
  onConnError(error: string): void;

  connectionState(): "connecting" | "open" | "closing" | "closed";
  isConnected(): boolean;
  remove(channel: Channel<any>): void;
  channel<T>(topic: string, chanParams?: any): Channel<T>;
  push(data: Msg): void;
  makeRef(): string;
  sendHeartbeat(): void;
  flushSendBuffer(): void;
  onConnMessage(rawMessage: {data: any}): void;
}

export class LongPoll {
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

type AnyFunc = (...args) => any;

export class Ajax {
  static request(
    method: string,
    endPoint: string,
    accept: string,
    body: string,
    timeout: number,
    ontimeout?: any,
    callback?: AnyFunc
  ): void;
  static xdomainRequest(
    req: any,
    method: string,
    endPoint: string,
    body: string,
    timeout: number,
    ontimeout?: AnyFunc,
    callback?: AnyFunc
  ): void;
  static xhrRequest(
    req: any,
    method: string,
    endPoint: string,
    accept: string,
    body: string,
    timeout: number,
    ontimeout?: AnyFunc,
    callback?: AnyFunc
  ): void;
  static parseJSON(resp: string): any;
  static serialize(obj: any, parentKey: string): string;
  static appendParams(url: string, params: any): string;
}

export var Presence: {
  syncState: (
    currentState,
    newState,
    onJoin?: AnyFunc,
    onLeave?: AnyFunc
  ) => any,
  syncDiff: (
    currentState,
    presences: {joins: any[], leaves: any[]},
    onJOin?: AnyFunc,
    onLeave?: AnyFunc
  ) => any,
  list: (presences: any[], chooser?: (key, pres) => any) => any,
  map: (obj: object, func: (key, val) => any) => any[],
  clone: (obj: object) => any
}

class Timer {
  constructor(callback: () => void, timerCalc: (tries: number) => void);

  callback: () => void;
  timerCalc: (tries: number) => void;
  timer?: number;
  tries: number;

  reset(): void;
  scheduleTimeout(): void;
}
}
