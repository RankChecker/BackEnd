import { Request } from "express";
import iconv from "iconv-lite";
import moment from "moment";
import { ApiService } from "../../../../services/apiService";
import { JSDOM } from "jsdom";

interface IKeyWord {
  keyword: string;
  links: string[];
}

export class FindWordsUseCase {
  words = [
    "Calibração detectores de gás",
    "Comissionamento sistema alarme incêndio",
    "Fire Lite manutenção",
    "Global Fire Manutenção",
    "Honeywell analytics calibração",
    "Instalação Esser",
    "Instalação Morley",
    "Instalação de Notifier",
    "Instalação PROTECTOWIRE",
    "Instalação Simplex",
    "Instalação Sistema alarme incêndio",
    "Instalação sistema de combate a incêndio",
    "Instalação sistema de supressão CO2",
    "Janus Manutenção",
    "Manutenção Eaton",
    "Manutenção Esser",
    "Manutenção Morley",
    "Manutenção Notifier",
    "Manutenção Preventiva Sistema Incêndio",
    "Manutenção Simplex",
    "MSA Calibração",
    "Programação Sistema alarme Incêndio",
    "Projeto Alarme de Incêndio",
    "Projeto Sistema de Combate a Incêndio",
    "Projeto Sistema de Supressão",
    "Startup Sistemas de Alarme Incêndio",
    "Telas Gráficas Sistema Alarme Incêndio",
    "Testes Sistema Alarme Incêndio",
    "VESDA Startup Programação",
    "Manutenção Corretiva Sistema Incêndio",
    "Manutenção Detector Linear Feixe",
    "Alinhamento Detector Beam",
    "Alinhamento Detector De Chama",
    "Calibração Detector De Hidrogênio",
    "Instalação Avisador Audio Visual",
    "Projeto FM-200",
    "Projeto Novec-1230",
    "Sistema De Detecção UL/FM",
    "Manutenção Detector de CO",
    "Manutenção Detector Por Aspiração",
    "Manutenção Detector De Alta Sensibilidade",
    "Manutenção Sirene De Alarme De Incêndio",
    "Manutenção Detector Multicritério",
    "Manutenção Audio Evacuação",
    "Manutenção Sistema Incêndio Convencional",
    "Betta Manutenção",
    "Equipamentos de Combate Incêndio",
    "Instalação Acionador Manual",
    "Instalação Alarme de Incêndio",
    "Intelbras Manutenção",
    "Kidde Manutenção",
    "Manutenção Alarme de Incêndio",
    "Manutenção Central Alarme Incêndio",
    "Manutenção Detecção Incêndio",
    "Manutenção Detector de Fumaça",
    "Manutenção Painel Alarme Incêndio",
    "Manutenção Sistema Contra Incêndio",
    "Manutenção Sistema Incêndio Endereçável",
    "Sistema Detecção e Alarme de Incêndio",
    "Tecnohold Manutenção",
    "Agente limpo manutenção",
    "Detecção de gás calibração",
    "Agente limpo instalação",
    "Detector de chama manutenção",
    "Novec-1230 manutenção",
    "VESDA manutenção",
    "Detecção linear de temperatura",
    "FM-200 manutenção",
    "Contrato sistema de incêndio",
    "OSID manutenção",
    "Supressão manutenção",
    "Teste hidrostático cilindro",
    "Water mist instalação",
    "Proteção contra incêndio",
    "Detecção e alarme de incêndio",
    "Projeto SDAI",
    "Sistema de incêndio wireless",
    "Sistema certificado UL/FM",
    "Sistema incêndio para CPD",
    "Detecção de incêndio sem fio",
  ];
  client = "smartfire.com.br";

  async execute(req: Request) {
    const endpoints = this.createEndpoints(this.words);
    const word = await this.generatePages(req, endpoints, this.client);
    return word;
  }

  createEndpoints(keywords: string[]) {
    return keywords.map((keyword) => ({
      keyword,
      links: Array.from(Array(5).keys()).map((key) =>
        key === 0
          ? `search?q=${encodeURI(keyword)}`
          : `search?q=${encodeURI(keyword)}&start=${key * 10}`
      ),
    }));
  }

  async generatePages(req: Request, words: IKeyWord[], client: string) {
    const result = [];

    for (const word of words) {
      for (const [page, link] of word.links.entries()) {
        if (
          req.app.locals.countPerPage === 45 &&
          this.checkIfHasNoPassedOneMinute(req)
        ) {
          req.app.locals.countPerPage = 0;
          await this.sleep(63000);
        }

        const buffer = await this.getWordInGoogle(link);
        const decodedHTML = iconv.decode(buffer, "ISO-8859-1");
        const mainComponent = this.getMainComponent(decodedHTML);
        const wordSearch = await this.searchKeyWord(
          mainComponent,
          word.keyword,
          client,
          page
        );
        req.app.locals.countPerPage++;
        req.app.locals.lastSearch = new Date();

        if (wordSearch.position !== -1) {
          result.push(wordSearch);
          break;
        } else {
          if (page - 1 === word.links.length)
            result.push({
              position: "Not founded",
              keyword: word.keyword,
              page: "Not founded",
            });
        }
      }
    }

    return result;
  }

  async getWordInGoogle(link: string) {
    const response = await ApiService.get(link);
    return response.data;
  }

  getMainComponent(buffer: any) {
    const mainIndex = buffer.indexOf('<div id="main">');
    const mainLastIndex = buffer.lastIndexOf("</div>");
    const mainContent = buffer.substring(mainIndex, mainLastIndex);
    return mainContent;
  }

  async searchKeyWord(
    buffer: any,
    keyword: string,
    client: string,
    page: number
  ) {
    const dom = new JSDOM(buffer);
    const document = dom.window.document;
    const divs = document.querySelectorAll("#main > div");
    const results: Element[] = [];

    divs.forEach((div) => {
      let areAdsense = false;
      div.querySelectorAll("span").forEach((span) => {
        if (span.innerText?.includes("Anúncio")) areAdsense = true;
      });

      if (areAdsense) return;

      const header = div.querySelector("h3")?.innerHTML;

      if (header) results.push(div);
    });

    const position = results.findIndex((div) => {
      if (
        div.querySelector("h3")?.innerHTML.includes(keyword) &&
        div.querySelector("a > div")?.innerHTML.includes(client)
      )
        return true;
    });

    console.log(position, keyword, client);

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
}
