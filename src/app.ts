import express, { NextFunction, Request, response, Response } from "express";
import { createServer, Server } from "http";
import { FindWordsController } from "./modules/rankWords/useCases/findWords/FindWordsController";
import AppSocket from "./services/AppSocket";

class App {
  app?: express.Application;
  PORT = 3001;
  server?: Server;
  findWordsController = new FindWordsController();

  constructor() {
    this.createApp();
    this.serverValues();
    this.sockets();
  }

  createApp() {
    this.app = express();
    this.app.get("/", (req, res) => res.json({ message: "RankChecker" }));
    this.app.get("/search", this.findWordsController.handle());
    // this.app.use(routes);
    this.app.use(
      (err: Error, req: Request, res: Response, next: NextFunction) => {
        if (err instanceof Error) {
          return response.status(400).json({
            message: err.message,
          });
        }

        return response.status(500).json({
          status: "error",
          message: "Internal Server Error",
        });
      }
    );
  }

  private serverValues() {
    if (!this.app) return;
    this.app.locals.countPerPage = 0;
    this.app.locals.lastSearch = null;
    this.app.set("runing", false);
  }

  private sockets(): void {
    this.server = createServer(this.app);
    new AppSocket(this.server, this.app);
  }
}

export default new App();
