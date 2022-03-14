import { Request, Response } from "express";
import { Page } from "puppeteer";
import { FindWordsUseCase } from "./FindWordsUseCase";

export class FindWordsController {
  handle(req: Request, res: Response) {
    if (req.app.get("runing"))
      return res.status(409).json({
        error: "Busca em progresso",
        message:
          "Uma busca já está sendo realizada. Aguarde para que possa adicionar uma nova.",
      });

    const { url, keywords, client } = req.body;

    if (!url || !keywords || !Array.isArray(keywords) || !client)
      return res.status(400).json({
        message:
          "Requisição mal formatada, verifique os dados e tente novamente.",
      });

    const findWordsUseCase = new FindWordsUseCase(req, client, url, keywords);
    req.app.set("runing", true);
    findWordsUseCase.execute().then((response) => {
      if (response) console.log("Busca de palavras finalizada com sucesso.");
      else console.log("Erro ao realizar a busca.");
    });

    res.json({
      message: "Realizando busca",
    });
  }
}
