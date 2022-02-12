import { Router } from "express";
import { FindWordsController } from "./modules/rankWords/useCases/findWords/FindWordsController";
import puppeteer from "puppeteer-extra";

const routes = Router();

let times = 0;

const runTask = () => {
  times++;
  console.log("Task");

  if (times === 10) return;

  setTimeout(() => runTask(), 1000);
};

const findWordsController = new FindWordsController();

routes.get("/search", findWordsController.handle);
routes.get("/run", (req, res) => {
  runTask();
  res.send("Executando");
});

export { routes };
