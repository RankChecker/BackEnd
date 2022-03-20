import { SocketSearchMessage, SocketSearchStatus } from "../../types/FindWords";

export interface ServerToClientEvents {
  error: (message: { message: Object }) => void;
  email: (message: { message: Object }) => void;
  searchStatus: (message: SocketSearchStatus | SocketSearchMessage) => void;
}

export interface ClientToServerEvents {
  connect: () => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  name: string;
  age: number;
}
