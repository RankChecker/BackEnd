import { JSDOM } from "jsdom";
import { Request } from "express";
import { Cluster } from "puppeteer-cluster";
import { sleep } from "../../../../utils/sleep";
import {
  SocketSearchStatus,
  TaskClusterData,
  WordPositionOnGoogle,
} from "../../../../types/FindWords";
import ExcelGenerator from "../../../../services/ExcelGenerator";
import MailSend from "../../../../services/MailSend";
import AdmZip from "adm-zip";
import { ApiService } from "../../../../services/apiService";
import nodeHtmlToImage from "node-html-to-image";

export class FindWord {
  request: Request;
  clientName: string;
  clientUrl: string;
  #cluster?: Cluster<TaskClusterData, any>;
  #keywords: string[];
  #rankedWords: number = 0;
  #keywordsZip = new AdmZip();
  #totalWordsLength = 0;
  #domain: number | undefined = undefined;

  constructor(
    req: Request,
    clientName: string,
    clientUrl: string,
    keywords: string[]
  ) {
    this.request = req;
    this.clientName = clientName;
    this.clientUrl = clientUrl;
    this.#keywords = keywords;
    this.#totalWordsLength = keywords.length;
    global.isRuning = true;
  }

  async execute() {
    this.executeSearch();
    return { message: "Success" };
  }

  getHtmlPage = async (link: string) => {
    const domains = [
      "https://google.com.br",
      "https://rank-proxy-two.herokuapp.com",
      "https://rank-proxy-third.herokuapp.com",
      "https://rankproxy.herokuapp.com",
    ];

    let data;

    for await (const [key, value] of Array.from(Array(3).entries())) {
      const domain = this.refreshDomain(domains.length);
      const url = `${domains[domain]}${link}`;

      const query = await ApiService.get(url);

      if (query.status !== 200) return;

      if (key === 4) {
        data = { message: "Error" };
        return;
      }

      data = query.data;
      break;
    }

    return data;
  };

  refreshDomain = (domainsLength: number) => {
    if (!this.#domain) this.#domain = 0;
    else this.#domain = this.#domain === domainsLength ? 0 : this.#domain++;
    return this.#domain;
  };

  executeSearch = async () => {
    this.setInitialStateForKeyWordsListStatus();

    const linksList = this.createEndpoints(this.#keywords);
    for await (const [key, { keyword, links }] of linksList.entries()) {
      for await (const [entry, { link, page, googleLink }] of links.entries()) {
        if (!keyword) return;

        await sleep(15);

        const buffer: any = await this.getHtmlPage(link);

        if (!!buffer?.message) return this.setGoogleRecaptchaError();

        const googleKeyWordPosition = this.getWordPositionOnGoogle(
          keyword,
          buffer,
          googleLink,
          page
        );

        if (googleKeyWordPosition.position === -1 && entry < 4) continue;

        this.changeKeyWordListAndEmit(googleKeyWordPosition);

        const screenshot = (await nodeHtmlToImage({
          html: buffer,
          quality: 70,
          type: "jpeg",
        })) as Buffer;

        if (screenshot)
          this.#keywordsZip.addFile(
            `screeshots/${keyword} - ${page}.webp`,
            screenshot
          );

        break;
      }
    }

    await this.sendReport();

    global.isRuning = false;
    global.searchStatus = {
      message: "Nenhuma busca sendo realizada no momento.",
    };
  };

  createEndpoints = (keywords: string[]) =>
    keywords.map((keyword) => ({
      keyword,
      links: Array.from(Array(4).keys()).map((key) => ({
        link: `/search?hl=pt-BR&gl=BR&q=${encodeURI(keyword)}&start=${
          key * 10
        }`,
        googleLink: `https://google.com/search?hl=pt-BR&gl=BR&q=${encodeURI(
          keyword
        )}&start=${key * 10}`,
        page: key * 10,
      })),
    }));

  /**
   * Define um status de erro na aplicação, informando que uma nova busca
   * só poderá ser realizada futuramente. Também encerra a instância atual
   * do Cluster criado.
   *
   * @example
   * if(repsonse.status() !== 200) return this.setGoogleRecaptchaError();
   */
  setGoogleRecaptchaError = async () => {
    global.isRuning = false;
    global.searchStatus = {
      message: "Nenhuma busca sendo realizada no momento.",
    };
    global.socket?.emit("error", {
      message:
        "Não foi possível realizar a busca, por favor, tente novamente mais tarde.",
    });

    await this.#cluster?.idle();
    await this.#cluster?.close();
  };

  /**
   * Recebe o código html da página renderizada pelo Cluster e localiza dentro do código
   * a posição da palavra, retorna -1 em position se a palavra não for localizada.
   *
   * @param {string}  keyword       Palavra chave que está sendo buscada
   * @param {any}     htmlPageCode  Código buffer gerado pelo Cluster
   * @param {string}  link          Link de consulta no Google
   * @param {number}  page          Número da Página em que a consulta foi realizada
   * @returns {WordPositionOnGoogle} {
   *  position: number;
   *  keyword: string;
   *  link: string;
   *  page: number;
   *  status: boolean;
   * }
   */
  getWordPositionOnGoogle = (
    keyword: string,
    htmlPageCode: any,
    link: string,
    page: number
  ): WordPositionOnGoogle => {
    const dom = new JSDOM(htmlPageCode);
    const document = dom.window.document;
    const getAllHeadersOnPage = document.querySelectorAll("#main h3");
    const allResults: { keywordText: string; link: string }[] = [];

    getAllHeadersOnPage.forEach((header) => {
      if (
        header.textContent === "As pessoas também perguntam" ||
        header.textContent === "Vídeos"
      )
        return;

      const keywordText = header.textContent;
      const link = header.closest("a");

      if (keywordText && link) {
        allResults.push({
          keywordText,
          link: link.href,
        });
      }
    });

    const position = allResults.findIndex(
      (keywordItem) =>
        (keywordItem.keywordText.includes(keyword) &&
          keywordItem.link.includes(this.clientUrl)) ||
        keywordItem.link.includes(this.clientUrl)
    );

    console.log({
      position,
      keyword,
      link,
      page: page < 4 ? page : -1,
      status: true,
    });

    return {
      position,
      keyword,
      link,
      page: page < 4 ? page : -1,
      status: true,
    };
  };

  setInitialStateForKeyWordsListStatus = () => {
    const keyList = this.#keywords.map((keyword, index) => ({
      id: index,
      position: -1,
      link: "",
      keyword: keyword,
      page: -1,
    }));

    global.searchStatus = {
      client: this.clientName,
      url: this.clientUrl,
      status: 0,
      keywords: keyList,
      count: keyList.length,
    };

    global.socket?.emit("searchStatus", global.searchStatus);
  };

  /**
   * Envia para o socket o status atual da busca.
   *
   * @param {WordPositionOnGoogle} keyword      Lista de palavras chave
   * @param {WordPositionOnGoogle} pendingWord  Próxima palavra chave que será buscada
   */
  changeKeyWordListAndEmit = (keyword: WordPositionOnGoogle) => {
    this.#rankedWords++;
    const percent = (100 / this.#totalWordsLength) * this.#rankedWords;
    const list = global.searchStatus as SocketSearchStatus;
    const newList = list.keywords.map((keystatus) =>
      keystatus.keyword === keyword.keyword
        ? { id: keystatus.id, ...keyword }
        : keystatus
    );

    global.searchStatus = {
      ...list,
      status: percent,
      keywords: newList,
    };

    global.socket?.emit("searchStatus", global.searchStatus);
  };

  async sendReport() {
    const excelWorkbook = new ExcelGenerator();
    const words = (global.searchStatus as SocketSearchStatus)?.keywords;
    excelWorkbook.generate(this.clientName, this.clientUrl, words);
    const buffer = await excelWorkbook.export();
    const zipBuffer = this.#keywordsZip.toBuffer();
    const mail = new MailSend();
    const response = await mail.sendmail(
      "financeiro.conceitopub@gmail.com",
      // "wueliton.horacio@gmail.com",
      `Seu relatório está pronto - ${this.clientName}`,
      Buffer.from(buffer),
      zipBuffer
    );
    if (!response) {
      global.socket?.emit("error", {
        message: "E-mail não enviado, contate o suporte.",
      });
      return false;
    } else {
      global.socket?.emit("email", {
        message: `E-mail enviado com sucesso para wueliton.horacio@gmail.com.`,
      });
      return true;
    }
  }
}
