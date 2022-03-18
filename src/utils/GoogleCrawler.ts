import { JSDOM } from "jsdom";
import { Cluster } from "puppeteer-cluster";
import { sleep } from "./sleep";

export const newCluster = async () => {
  let number = 0;
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 1,
  });

  await cluster.task(async ({ page, data }) => {
    const { keywords, offset } = data;
    const searchTherm: string = keywords.shift();
    const newKeywords: string[] = keywords;
    const url = `https://www.google.com/search?q=${searchTherm}&start=${offset}`;
    await sleep(15);
    const response = await page.goto(url);

    if (response.status() !== 200) {
      console.log({ error: "erro" });
      await cluster.idle();
      await cluster.close();
      return;
    }

    await page.screenshot({
      path: `${searchTherm} ${number}.png`,
    });

    const buffer: any = await page.evaluate(
      () => document.documentElement.outerHTML
    );
    const dom = new JSDOM(buffer);
    const document = dom.window.document;
    const headers = document.querySelectorAll("#search h3");
    const results: { keywordText: string; link: string }[] = [];

    headers.forEach((header) => {
      if (
        header.textContent === "As pessoas também perguntam" ||
        header.textContent === "Vídeos"
      )
        return;

      const keywordText = header.textContent;
      const link = header.closest("a");

      if (keywordText && link) {
        results.push({
          keywordText,
          link: link.href,
        });
      }
    });

    const position = results.findIndex(
      (keywordItem) =>
        keywordItem.keywordText.includes(searchTherm) &&
        keywordItem.link.includes("smartfire.com.br")
    );

    console.log({
      position,
      searchTherm,
      url,
      page,
      status: true,
    });

    if (offset < 4)
      cluster.queue({
        keywords: [searchTherm, ...newKeywords],
        offset: offset + 1,
      });
    else if (!!newKeywords.length)
      cluster.queue({ keywords: newKeywords, offset: 0 });

    number++;
  });

  cluster.queue({
    keywords: [
      "Honeywell analytics calibração",
      "Instalação Esser",
      "Instalação Morley",
      "Instalação de Notifier",
      "Instalação PROTECTOWIRE",
    ],
    offset: 0,
  });

  await cluster.idle();
  await cluster.close();
};
