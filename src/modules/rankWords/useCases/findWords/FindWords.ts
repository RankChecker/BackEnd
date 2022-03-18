import { ApiService } from "../../../../services/apiService";
import { Request, Response } from "express";
import { KeyWordsArrayType } from "../../../../types/KeyWordsArray";
import { sleep } from "../../../../utils/sleep";
import { JSDOM } from "jsdom";
import puppeteer, { Page } from "puppeteer";
import { newCluster } from "../../../../utils/GoogleCrawler";

export const runSearch = async (req: Request, res: Response) => {
  const keywords = [
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
  const endpoints = generateEndpoints(keywords);
  newCluster();

  return res.json({ message: "teste" });
};

const readAllWords = async (endpoints: KeyWordsArrayType[]) => {
  let actualWord = null;
  let actualPage = 0;
  let readedWords: string[] = [];
  const browser = await puppeteer.launch({
    args: ["--single-process"],
  });
  const page = await browser.newPage();

  for (const endpoint of endpoints) {
    const { keyword, link } = endpoint;

    if (readedWords.includes(keyword)) continue;
    if (keyword !== actualWord) {
      actualWord = keyword;
      actualPage = 0;
    }

    await sleep(15);

    const wordSearch = await searchKeyWord(
      page,
      keyword,
      link,
      "smartfire.com.br",
      actualPage
    );

    if (wordSearch?.position !== -1) readedWords.push(keyword);

    console.log(wordSearch);

    actualPage++;
  }
};

/*
  
*/
const generateEndpoints = (keywords: string[]) => {
  const array = [] as KeyWordsArrayType[];
  keywords.map((keyword) => {
    Array.from(Array(5).keys()).map((key) =>
      array.push({
        keyword,
        link:
          key === 0
            ? `https://google.com.br/search?hl=pt-BR&cr=countryBR&q=${encodeURI(
                keyword
              )}`
            : `https://google.com.br/search?hl=pt-BR&cr=countryBR&q=${encodeURI(
                keyword
              )}&start=${key * 10}`,
      })
    );
  });
  return array;
};

const getPageHtmlCode = async (url: string) => {
  const { data, status } = await ApiService.get(url);
  if (status === 200) return data.toString("utf8");

  return {
    error: status,
    message: "Erro recaptcha, tente novamente mais tarde.",
  };
};

const searchKeyWord = async (
  browserPage: Page,
  keyword: string,
  link: string,
  url: string,
  page: number
) => {
  await browserPage.goto(link);
  const buffer: any = await browserPage.evaluate(
    () => document.documentElement.outerHTML
  );

  if (!!buffer.error) return null;

  const dom = new JSDOM(buffer);
  const document = dom.window.document;
  const headers = document.querySelectorAll("#search h3");
  const results: { keywordText: string; link: string }[] = [];

  console.log(headers);

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
      keywordItem.keywordText.includes(keyword) &&
      keywordItem.link.includes(url)
  );

  await browserPage.close();

  return {
    position,
    keyword,
    link,
    page,
    status: true,
  };
};
