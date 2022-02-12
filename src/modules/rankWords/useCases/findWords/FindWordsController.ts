import { Request, Response } from "express";
import { FindWordsUseCase } from "./FindWordsUseCase";

export class FindWordsController {
  async handle(req: Request, res: Response) {
    const findWordsUseCase = new FindWordsUseCase();
    const response = await findWordsUseCase.execute(req);
    res.json(response);
  }
}
