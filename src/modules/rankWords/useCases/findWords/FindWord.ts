import { JSDOM } from "jsdom";
import { Request } from "express";
import { Cluster } from "puppeteer-cluster";
import { sleep } from "../../../../utils/sleep";
import {
  ClusterData,
  SocketSearchStatus,
  TaskClusterData,
  WordPositionOnGoogle,
} from "../../../../types/FindWords";
import ExcelGenerator from "../../../../services/ExcelGenerator";
import MailSend from "../../../../services/MailSend";
import AdmZip from "adm-zip";
import fs from "fs";

export class FindWord {
  request: Request;
  clientName: string;
  clientUrl: string;
  #cluster?: Cluster<TaskClusterData, any>;
  #keywords: string[];
  #rankedWords: number = 0;
  #keywordsZip = new AdmZip();
  #totalWordsLength = 0;

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
    this.#cluster = await this.createCluster();
    this.#cluster.task(this.clusterTaskExecution);
    this.#cluster?.queue({ keywords: this.#keywords, offset: 0 });
    this.setInitialStateForKeyWordsListStatus();
    return { message: "Success" };
  }

  /**
    Inicia um Cluster com uma instância do Browser sem o método sandbox e com o SetUID desabilitado.
  */
  createCluster = async (): Promise<Cluster<TaskClusterData, any>> =>
    await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT,
      maxConcurrency: 1,
      puppeteerOptions: {
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    });

  /**
   * Definições da task que será executada para cada item na lista,
   * verifica se um resultado foi encontrado para adicionar a próxima task na fila
   *
   * @example
   * await cluster.task(clusterTaskExecution)
   *
   * @param {ClusterData} params  Obrigatório Contém a Página da Instância do Browser e os dados a serem lidos
   *
   * @returns
   * Promise<void>
   */
  clusterTaskExecution = async ({ page, data }: ClusterData) => {
    const { keywords, offset } = data;
    const keyword = keywords.shift();
    const start = offset * 10;

    if (!keyword) return;

    const defaultURL = `https://www.google.com/search?q=${encodeURI(
      keyword
    )}&start=${start}`;

    /* Aguarda 15 segundos para executar a busca, para que não retorne erro 429 */
    await sleep(15);

    await page.setGeolocation({
      latitude: -23.5916229,
      longitude: -46.5929353,
    });

    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36 OPR/38.0.2220.41"
    );

    const response = await page.goto(defaultURL);
    /* Verifica se o status da requisição é diferente de 200, se positivo, define status de erro para aplicação */
    if (response.status() !== 200) return this.setGoogleRecaptchaError();

    const buffer: any = await page.evaluate(
      () => document.documentElement.outerHTML
    );

    if (!buffer) return this.setGoogleRecaptchaError();

    const googleKeyWordPosition = this.getWordPositionOnGoogle(
      keyword,
      buffer,
      defaultURL,
      offset
    );
    if (googleKeyWordPosition.position !== -1 || offset === 4)
      this.changeKeyWordListAndEmit(googleKeyWordPosition);

    if (googleKeyWordPosition.position !== -1) {
      const screenshot = await page.screenshot({
        fullPage: true,
        quality: 70,
        type: "webp",
      });
      const screenshotToBuffer =
        typeof screenshot === "string" ? Buffer.from(screenshot) : screenshot;
      if (screenshot)
        this.#keywordsZip.addFile(
          `screeshots/${keyword} - ${page}.webp`,
          screenshotToBuffer
        );
    }

    if (offset < 4 && googleKeyWordPosition.position === -1)
      this.#cluster?.queue({
        keywords: [keyword, ...keywords],
        offset: offset + 1,
      });
    else if (!!keywords.length) {
      console.log(keywords.length);
      this.#cluster?.queue({ keywords, offset: 0 });
    } else {
      await this.sendReport();
      global.isRuning = false;
      global.searchStatus = {
        message: "Nenhuma busca sendo realizada no momento.",
      };
    }
  };

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
