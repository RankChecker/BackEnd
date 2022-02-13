import { Request, Response } from "express";
import { FindWordsUseCase } from "./FindWordsUseCase";

export class FindWordsController {
  async handle(req: Request, res: Response) {
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
    await findWordsUseCase.execute();
  }
}
