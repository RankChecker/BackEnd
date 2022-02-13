import express, { NextFunction, Request, response, Response } from "express";
import { createServer, Server } from "http";
import { FindWordsController } from "./modules/rankWords/useCases/findWords/FindWordsController";
import AppSocket from "./services/AppSocket";
import cors from "cors";
import Queue from "bull";

class App {
  app?: express.Application;
  PORT = 3001;
  server?: Server;
  findWordsController = new FindWordsController();
  queue = new Queue("wordRank");

  constructor() {
    this.createApp();
    this.serverValues();
    this.sockets();
  }

  createApp() {
    this.app = express();
    this.app.use(express.json());
    this.app.use(cors());
    this.app.get("/", (req, res) => res.json({ message: "RankChecker" }));
    this.app.get("/status", (req, res) =>
      res.json(req.app.get("searchStatus"))
    );
    this.app.get("/restart", (req, res) => {
      req.app.set("lastSearch", null);
      req.app.set("runing", false);
      req.app.set("searchStatus", {
        message: "Nenhuma busca sendo realizada no momento.",
      });

      res.json({ message: "Status de busca reiniciado." });
    });
    this.app.get("/search", (req, res) => {
      this.queue.process(async (job, done) => {
        console.log("Adicionado a fila");
        await this.findWordsController.handle(req, res);
        console.log("Fila processada");
        done();
      });

      return res.json({
        message: "Realizando busca",
      });
    });

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
    this.app.set("countPerPage", 0);
    this.app.set("lastSearch", null);
    this.app.set("runing", false);
    this.app.set("searchStatus", {
      message: "Nenhuma busca sendo realizada no momento.",
    });
  }

  private sockets(): void {
    this.server = createServer(this.app);
    new AppSocket(this.server, this.app);
  }
}

export default new App();
