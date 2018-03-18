phoenix-typings
===

Types for the Phoenix Framework JS Library version 1.3.0.

## Installation

This isn't available on a repo. You can add it via a git directive to your
package.json file.

```javascript
{
  ...
  "devDependencies": {
    ...
    "phoenix-typings": "git://github.com/teaearlgraycold/phoenix-typings.git"
  }
}
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
