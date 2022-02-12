import { Request, Response } from "express";
import { FindWordsUseCase } from "./FindWordsUseCase";

export class FindWordsController {
  handle() {
    return (req: Request, res: Response) => {
      if (req.app.get("runing"))
        return res.status(403).json({
          error: "Busca em progresso",
          message:
            "Uma busca já está sendo realizada. Aguarde para que possa adicionar uma nova.",
        });

      const findWordsUseCase = new FindWordsUseCase(req);
      req.app.set("runing", true);
      findWordsUseCase.execute();

      res.json({
        message: "Realizando busca",
      });
    };
  }
}
