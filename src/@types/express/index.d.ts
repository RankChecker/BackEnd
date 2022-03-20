import * as socketIo from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "../@socket.io";
import {
  SearchStatusMessage,
  WordPositionOnGoogle,
  SocketSearchStatus,
} from "../../types/FindWords";

declare global {
  var socket:
    | socketIo.Server<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
      >
    | undefined;
  var isRuning: boolean;
  var searchStatus: SocketSearchStatus | SearchStatusMessage;

  interface GlobalInterface {
    value: unknown;
  }

  type GlobalType = {
    value: unknown;
  };
}

export {};
