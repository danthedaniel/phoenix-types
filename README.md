phoenix-types
===

[![npm version](https://badge.fury.io/js/phoenix-types.svg)](https://badge.fury.io/js/phoenix-types) [![MIT License](https://img.shields.io/packagist/l/doctrine/orm.svg)]()

Types for the Phoenix Framework JS Library version 1.3.0.

## Installation

```bash
npm install -S phoenix-types
```

## Usage

```typescript
import { Socket, Channel } from "phoenix";

interface SocketAuth {
  auth_token: string
}

interface ChannelTx {
  message: string
}

interface ChannelRx {
  message: string,
  user: string
}

const params = {auth_token: "..."};
let socket = new Socket<SocketAuth>("/my_endpoint", {params});
socket.connect();
let channel = socket.channel<ChannelTx, ChannelRx>("room:lobby");
channel.join()
  .receive("ok", () => console.log("connected"))
  .receive("error", () => console.error("could not connect"));
```
