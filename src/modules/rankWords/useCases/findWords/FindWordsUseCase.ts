import { Request } from "express";
import { JSDOM } from "jsdom";
import puppeteer, { Browser, Page } from "puppeteer";
import ExcelGenerator from "../../../../services/ExcelGenerator";
import MailSend from "../../../../services/MailSend";
import AdminZip from "adm-zip";

interface IKeyWord {
  keyword: string;
  links: string[];
}

interface IKeyWordStatus {
  id?: number;
  position: number;
  keyword: string;
  link: string;
  page: number;
  status?: boolean;
}

export class FindWordsUseCase {
  words: string[] = [];
  url: string;
  page?: puppeteer.Page;
  #request?: Request;
  client: string;
  #keywordsZip = new AdminZip();

  constructor(
    page: Page | undefined,
    req: Request,
    client: string,
    url: string,
    words: string[]
  ) {
    this.#request = req;
    this.url = url;
    this.words = words;
    this.client = client;
    this.page = page;
  }

  private getSearchStatus() {
    return this.#request?.app.get("searchStatus");
  }

  private sleep(seconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1000 * seconds));
  }

  async execute() {
    const endpoints = this.createEndpoints(this.words);
    this.setKeywordsListStatus(this.words);
    const generated = await this.generatePages(endpoints, this.url);

    if (!generated) return false;
    this.#request?.app.set("searchStatus", {
      message: "Nenhuma busca sendo realizada no momento.",
    });
    this.emit("result", { message: "Pesquisa finalizada com sucesso." });
    return true;
  }

  private emit(id: string, message: any) {
    this.#request?.app.get("socketIo").sockets.emit(id, message);
  }

  private createEndpoints(keywords: string[]) {
    return keywords.map((keyword) => ({
      keyword,
      links: Array.from(Array(5).keys()).map((key) =>
        key === 0
          ? `https://google.com.br/search?hl=pt-BR&cr=countryBR&q=${encodeURI(
              keyword
            )}`
          : `https://google.com.br/search?hl=pt-BR&cr=countryBR&q=${encodeURI(
              keyword
            )}&start=${key * 10}`
      ),
    }));
  }

  private setKeywordsListStatus(keywords: string[]) {
    const keyList = keywords.map((keyword, index) => ({
      id: index,
      position: -1,
      link: "",
      keyword: keyword,
      page: -1,
    }));

    this.#request?.app.set("searchStatus", {
      client: this.client,
      url: this.url,
      status: 0,
      keywords: keyList,
      count: keyList.length,
    });

    this.emit("searchStatus", this.getSearchStatus());
  }

  private editKeywordsListStatus(keyword: IKeyWordStatus, percent: number) {
    const list = this.getSearchStatus();
    const newList = list.keywords.map((keystatus: IKeyWordStatus) =>
      keystatus.keyword === keyword.keyword
        ? { id: keystatus.id, ...keyword }
        : keystatus
    );
    this.#request?.app.set("searchStatus", {
      ...list,
      status: percent,
      keywords: newList,
    });

    this.emit("searchStatus", this.getSearchStatus());
  }

  private async generatePages(words: IKeyWord[], url: string) {
    for (const [index, word] of words.entries()) {
      for (const [page, link] of word.links.entries()) {
        await this.sleep(15);
        const buffer = await this.getWordInGoogle(link);
        const percent = (100 / words.length) * (index + 1);

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
          link,
          url,
          page
        );

        if (this.#request) {
          let count = this.#request.app.get("countPerPage");
          this.#request.app.set("countPerPage", count++);
          this.#request.app.set("lastSearch", new Date());
        }

        if (wordSearch.position !== -1) {
          this.editKeywordsListStatus(wordSearch, percent);
          break;
        } else {
          if (+page === +word.links.length - 1) {
            const data = {
              position: -1,
              keyword: word.keyword,
              link: "",
              page: -1,
              status: false,
            };

            this.editKeywordsListStatus(data, percent);
          }
        }
      }
    }

    this.#request?.app.set("runing", false);
    const sendReport = await this.sendReport();
    if (sendReport) return true;
    return false;
  }

  private async getWordInGoogle(link: string) {
    const response = await this.page?.goto(link, {
      waitUntil: "load",
      timeout: 0,
    });
    if (response?.status() !== 200) {
      this.#request?.app.set("runing", false);
      this.#request?.app.set("searchStatus", {
        message: "Nenhuma busca sendo realizada no momento.",
      });
      this.emit("error", {
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
    link: string,
    url: string,
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
        keywordItem.link.includes(url)
    );

    if (position !== -1) {
      const buffer = await this.page?.screenshot({
        fullPage: true,
        type: "webp",
        quality: 85,
      });
      if (buffer)
        this.#keywordsZip.addFile(
          `screeshots/${keyword} - ${page}.webp`,
          Buffer.from(buffer)
        );
    }

    return {
      position,
      keyword,
      link,
      page,
      status: true,
    };
  }

  private async sendReport() {
    const excelWorkbook = new ExcelGenerator();
    const words = this.getSearchStatus().keywords;
    excelWorkbook.generate(this.client, this.url, words);
    const buffer = await excelWorkbook.export();
    const zipBuffer = this.#keywordsZip.toBuffer();
    const mail = new MailSend();
    const response = await mail.sendmail(
      // "financeiro.conceitopub@gmail.com,bruna.conceitopub@gmail.com",
      "wueliton.horacio@gmail.com",
      `Seu relatório está pronto - ${this.client}`,
      Buffer.from(buffer),
      zipBuffer
    );
    if (!response) {
      this.emit("error", {
        message: "E-mail não enviado, contate o suporte.",
      });
      return false;
    } else {
      this.emit("email", {
        message: `E-mail enviado com sucesso para wueliton.horacio@gmail.com.`,
      });
      return true;
    }
  }
}
