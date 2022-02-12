import { Request } from "express";
import moment from "moment";
import { JSDOM } from "jsdom";
import puppeteer, { Browser } from "puppeteer";

interface IKeyWord {
  keyword: string;
  links: string[];
}

export class FindWordsUseCase {
  words = [
    "Cilindros Hidráulicos",
    "Cilindros Hidráulicos De Alta Pressão",
    "Cilindros Hidráulicos 700 Bar",
    "Cilindros Hidráulicos Especiais",
    "Mini Cilindros Hidráulicos",
    "Cilindros De Alta Pressão",
    "Macacos Hidráulicos De Alta Pressão",
    "Macacos Hidráulicos",
    "Macaco Hidráulico De Alta Pressão",
    "Equipamentos Hidráulicos",
    "Equipamentos Hidráulicos De Alta Pressão",
    "Equipamentos Hidráulicos 700 Bar",
    "Saca Rolamento Ferroviário",
  ];
  client = "usiwal.com.br";
  engine?: Browser;
  page?: puppeteer.Page;
  #request?: Request;

  constructor(req: Request) {
    this.#request = req;
  }

  async execute() {
    const endpoints = this.createEndpoints(this.words);
    await this.generatePages(endpoints, this.client);
  }

  createEndpoints(keywords: string[]) {
    return keywords.map((keyword) => ({
      keyword,
      links: Array.from(Array(5).keys()).map((key) =>
        key === 0
          ? `https://google.com.br/search?q=${encodeURI(keyword)}`
          : `https://google.com.br/search?q=${encodeURI(keyword)}&start=${
              key * 10
            }`
      ),
    }));
  }

  async generatePages(words: IKeyWord[], client: string) {
    const result: any = [];

    for (const word of words) {
      for (const [page, link] of word.links.entries()) {
        await this.sleep(5000);
        const buffer = await this.getWordInGoogle(link);

        if (!buffer?.length)
          return {
            error: {
              status: 429,
              message:
                "Erro ao tentar pesquisar palavras-chave, por favor, tente novamente mais tarde.",
            },
          };

        const wordSearch = await this.searchKeyWord(
          buffer,
          word.keyword,
          client,
          page
        );

        if (this.#request) {
          this.#request.app.locals.countPerPage++;
          this.#request.app.locals.lastSearch = new Date();
        }

        if (wordSearch.position !== -1) {
          this.#request?.app.get("socketIo").emit("searchStatus", wordSearch);
          result.push(wordSearch);
          break;
        } else {
          if (+page === +word.links.length - 1) {
            const data = {
              position: "Not founded",
              keyword: word.keyword,
              page: "Not founded",
            };

            this.#request?.app.get("socketIo").emit("searchStatus", data);

            result.push(data);
          }
        }
      }
    }

    this.#request?.app.set("runing", false);
    return this.#request?.app.get("socketIo").sockets.emit("result", result);
  }

  async getWordInGoogle(link: string) {
    await this.closeBrowser();
    if (!this.engine) this.engine = await puppeteer.launch();
    if (!this.page) this.page = await this.engine?.newPage();

    const response = await this.page?.goto(link, {
      waitUntil: "load",
      timeout: 0,
    });
    if (response?.status() !== 200) {
      this.#request?.app.get("socketIo").sockets.emit("error", {
        message: "Erro ao buscar, tente novamente mais tarde",
      });
      return null;
    }

    const data = await this.page?.evaluate(
      () => document.documentElement.outerHTML
    );

    return data;
  }

  async searchKeyWord(
    buffer: any,
    keyword: string,
    client: string,
    page: number
  ) {
    const dom = new JSDOM(buffer);
    const document = dom.window.document;
    const headers = document.querySelectorAll("#search h3");
    const results: { keywordText: string; link: string }[] = [];

    headers.forEach((header) => {
      if (
        header.textContent === "As pessoas também perguntam" ||
        header.textContent === "Víddeos"
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
        keywordItem.keywordText.includes(keyword) &&
        keywordItem.link.includes(client)
    );

    if (position !== -1)
      await this.page?.screenshot({
        path: `screeshots/${keyword} - ${page}.png`,
        fullPage: true,
      });

    console.log({
      position,
      keyword,
      page,
    });

    return {
      position,
      keyword,
      page,
    };
  }

  checkIfHasNoPassedOneMinute(req: Request) {
    const actualDate = new Date();
    const end = moment(req.app.locals.lastSearch);
    const duration = moment.duration(end.diff(actualDate));
    const minutes = duration.asMinutes();
    return minutes < 1;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async closeBrowser() {
    if (!this.engine && !this.page) return;
    await this.page?.close();
    await this.engine?.close();
    this.page = undefined;
    this.engine = undefined;
  }
}
