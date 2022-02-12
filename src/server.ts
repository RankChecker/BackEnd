import express, { NextFunction, Request, response, Response } from "express";
import "dotenv/config";
import { routes } from "./routes";
import { google } from "googleapis";

const customSearch = google.customsearch("v1");

const app = express();
const port = process.env.PORT || 3000;

// Variáveis globais para controlar a quantiade de busca máxima
// a ser executada no intervalo de 1 minuto (até 50 requisições por minuto)
app.locals.countPerPage = 0;
app.locals.lastSearch = null;

app.use(express.json());
app.use(routes);

app.get("/", async (req, res) => {
  const response = await customSearch.cse.list({
    auth: process.env.API_KEY,
    cx: process.env.SEARCH_ENGINE_ID,
    q: "Automação Hidráulica",
    num: 10,
    googlehost: "google.com.br",
    start: 30,
    hl: "pt-BR",
  });

  res.json(response);
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof Error) {
    return response.status(400).json({
      message: err.message,
    });
  }

  return response.status(500).json({
    status: "error",
    message: "Internal Server Error",
  });
});

app.listen(port, () =>
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`)
);
