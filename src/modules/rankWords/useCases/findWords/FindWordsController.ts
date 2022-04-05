import { Request, Response } from "express";
import { FindWord } from "./FindWord";

export class FindWordsController {
  handle(req: Request, res: Response) {
    if (global.isRuning)
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

    const findWordsUseCase = new FindWord(req, client, url, keywords);
    findWordsUseCase.execute();

    res.json({
      message: "Realizando busca",
    });
  }
}
