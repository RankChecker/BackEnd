import { Router } from "express";
import { FindWordsController } from "./modules/rankWords/useCases/findWords/FindWordsController";
import puppeteer from "puppeteer-extra";

const routes = Router();

const findWordsController = new FindWordsController();

// puppeteer.use(
//   RecaptchaPlugin({
//     provider: { id: "2captcha", token: "cbb96e80d332cab357296670b931900b" },
//     visualFeedback: false,
//   })
// );

// routes.get("/", (req, res) => res.json({ message: "Hello World" }));
routes.get("/recaptcha", async (req, res) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });
  const page = await browser.newPage();
  await page.goto("http://www.google.com/search?igu=1");
  // await page.solveRecaptchas();
  // await Promise.all([
  //   page.waitForNavigation(),
  //   page.click(`#recaptcha-demo-submit`),
  // ]);
  // await page.click("#recaptcha-anchor");

  const pageContent = await page.content();
  const print = await page.screenshot({
    path: "screen-shot.png",
    fullPage: true,
  });
  await page.close();
  await browser.close();
  return res.send(pageContent);
});
routes.get("/search", findWordsController.handle);

export { routes };
