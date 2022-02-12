import express, { NextFunction, Request, response, Response } from "express";
import { createServer, Server } from "http";
import { FindWordsController } from "./modules/rankWords/useCases/findWords/FindWordsController";
import AppSocket from "./services/AppSocket";
import ExcelGenerator from "./services/ExcelGenerator";
import MailSend from "./services/MailSend";

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
    this.app.get("/send", async (req, res) => {
      const excel = new ExcelGenerator();
      excel.generate();
      const buffer = await excel.export();
      const mail = new MailSend();
      const success = await mail.sendmail(
        "wueliton.horacio@gmail.com",
        "Seu relatório está pronto",
        Buffer.from(buffer)
      );
      if (!success)
        return res.json({ message: "Houve um erro ao tentar enviar o e-mail" });
      return res.json({ message: "E-mail enviado com sucesso" });
    });
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
    this.app.set("countPerPage", 0);
    this.app.set("lastSearch", null);
    this.app.set("runing", false);
  }

  private sockets(): void {
    this.server = createServer(this.app);
    new AppSocket(this.server, this.app);
  }
}

export default new App();
