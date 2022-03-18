import { JSDOM } from "jsdom";
import { Cluster } from "puppeteer-cluster";
import { sleep } from "./sleep";

export const newCluster = async () => {
  let number = 0;
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 1,
    puppeteerOptions: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
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
      offset,
      status: true,
    });

    if (offset < 4 && position === -1)
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
    ],
    offset: 0,
  });

  await cluster.idle();
  await cluster.close();
};
