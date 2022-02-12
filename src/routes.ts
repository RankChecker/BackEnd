import { Router } from "express";
import { FindWordsController } from "./modules/rankWords/useCases/findWords/FindWordsController";
import puppeteer from "puppeteer";

const routes = Router();

const findWordsController = new FindWordsController();

routes.get("/search", findWordsController.handle);
routes.get("/page", async (req, res) => {
  const engine = await puppeteer.launch();
  const page = await engine.newPage();
  await page.goto(
    `https://google.com.br/search?q=${encodeURI(
      "Comissionamento sistema alarme incêndio"
    )}`
  );
  const data = await page.evaluate(() => document.documentElement.outerHTML);
  res.send(data);
});

export { routes };
