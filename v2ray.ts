import {
  closeWebSocket,
  delay,
  makeReadableWebSocketStream,
  processVlessHeader,
} from "./libs/index.ts";
import * as uuid from "https://jspm.dev/uuid";

const userID = Deno.env.get("uuid") || "";
const isVaildUser = uuid.validate(userID);
if (!isVaildUser) {
  console.log("not set valid uuid");
}

Deno.serve((req: Request): Response | Promise<Response> => {
  if (!isVaildUser) {
    return new Response("404 Page Not Found", { status: 401 });
  }

  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() != "websocket") {
    return new Response("404 Page Not Found", { status: 401 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  socket.addEventListener("open", () => {});

  const earlyDataHeader = req.headers.get("sec-websocket-protocol") || "";
  processWebSocket({ userID, socket, earlyDataHeader });
  return response;
});

async function processWebSocket({
  userID,
  socket,
  earlyDataHeader,
}: {
  userID: string;
  socket: WebSocket;
  earlyDataHeader: string;
}) {
  let address = "";
  let portWithRandomLog = "";
  let remoteConnection: {
    // deno-lint-ignore no-explicit-any
    readable: any;
    // deno-lint-ignore no-explicit-any
    writable: any;
    // deno-lint-ignore no-explicit-any
    write: (arg0: Uint8Array) => any;
    close: () => void;
  } | null = null;
  // deno-lint-ignore ban-types
  let remoteConnectionReadyResolve: Function;
  try {
    const readableWebSocketStream = makeReadableWebSocketStream(
      socket,
      earlyDataHeader,
    );
    let vlessResponseHeader: Uint8Array | null = null;

    // ws --> remote
    readableWebSocketStream
      .pipeTo(
        new WritableStream({
          async write(chunk, controller) {
            const vlessBuffer = chunk;
            if (remoteConnection) {
              await remoteConnection.write(
                new Uint8Array(vlessBuffer),
              );
              return;
            }
            const {
              hasError,
              message,
              portRemote,
              addressRemote,
              rawDataIndex,
              vlessVersion,
              isUDP,
            } = processVlessHeader(vlessBuffer, userID);
            address = addressRemote || "";
            portWithRandomLog = `${portRemote}--${Math.random()}`;
            if (isUDP) {
              console.log("udp");
              controller.error(
                `[${address}:${portWithRandomLog}] command udp is not support `,
              );
              return;
            }
            if (hasError) {
              controller.error(`[${address}:${portWithRandomLog}] ${message} `);
            }
            // const addressType = requestAddr >> 4;
            // const addressLength = requestAddr & 0x0f;
            console.log(`[${address}:${portWithRandomLog}] connecting`);
            remoteConnection = await Deno.connect({
              port: portRemote!,
              hostname: address,
            });

            vlessResponseHeader = new Uint8Array([vlessVersion![0], 0]);
            const rawClientData = vlessBuffer.slice(rawDataIndex!);
            await remoteConnection!.write(new Uint8Array(rawClientData));
            remoteConnectionReadyResolve(remoteConnection);
          },
          close() {
            console.log(
              `[${address}:${portWithRandomLog}] readableWebSocketStream is close`,
            );
          },
          abort(reason) {
            console.log(
              `[${address}:${portWithRandomLog}] readableWebSocketStream is abort`,
              JSON.stringify(reason),
            );
          },
        }),
      )
      .catch((error) => {
        console.error(
          `[${address}:${portWithRandomLog}] readableWebSocketStream pipeto has exception`,
          error.stack || error,
        );
      });
    await new Promise((resolve) => (remoteConnectionReadyResolve = resolve));
    let remoteChunkCount = 0;
    // remote --> ws
    await remoteConnection!.readable.pipeTo(
      new WritableStream({
        start() {
          if (socket.readyState === socket.OPEN) {
            socket.send(vlessResponseHeader!);
          }
        },
        async write(chunk: Uint8Array, controller) {
          function send2WebSocket() {
            if (socket.readyState !== socket.OPEN) {
              controller.error(
                `can't accept data from remoteConnection!.readable when client webSocket is close early`,
              );
              return;
            }
            socket.send(chunk);
          }

          remoteChunkCount++;
          if (remoteChunkCount < 20) {
            send2WebSocket();
          } else if (remoteChunkCount < 120) {
            await delay(10); // 64kb * 100 = 6m/s
            send2WebSocket();
          } else if (remoteChunkCount < 500) {
            await delay(20); // (64kb * 1000/20) = 3m/s
            send2WebSocket();
          } else {
            await delay(50); // (64kb * 1000/50)  /s
            send2WebSocket();
          }
        },
        close() {
          console.log(
            `[${address}:${portWithRandomLog}] remoteConnection!.readable is close`,
          );
        },
        abort(reason) {
          closeWebSocket(socket);
          console.error(
            `[${address}:${portWithRandomLog}] remoteConnection!.readable abort`,
            reason,
          );
        },
      }),
    );
  } catch (error) {
    console.error(
      `[${address}:${portWithRandomLog}] processWebSocket has exception `,
      error.stack || error,
    );
    closeWebSocket(socket);
  }
  return;
}
