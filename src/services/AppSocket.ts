import express, { Request } from "express";
import { Server } from "http";
import socketIo from "socket.io";

class AppSocket {
  #io?: socketIo.Server;

  constructor(server: Server, app: express.Application | undefined) {
    this.#io = require("socket.io")(server);
    app?.set("socketIo", this.#io);
    this.listen();
  }

  private listen() {
    this.#io?.on("connection", (socket: any) => {
      console.log("Socket conectado");
    });
  }
}

export default AppSocket;
