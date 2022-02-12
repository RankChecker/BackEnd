import { Request, Response } from "express";
import { FindWordsUseCase } from "./FindWordsUseCase";

export class FindWordsController {
  async handle(req: Request, res: Response) {
    const findWordsUseCase = new FindWordsUseCase();
    findWordsUseCase.execute(req);
    res.json({
      message: "Runing Search",
    });
  }
}
