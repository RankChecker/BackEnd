import axios from "axios";

export const ApiService = axios.create({
  baseURL: "https://google.com.br",
  headers: {
    Accept:
      "text/xml,application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5",
    "Cache-Control": "max-age=0",
    "Accept-Language": "pt-br,pt;q=0.5",
    "Content-type": "UTF-8",
    "User-Agent": "giraffe",
  },
  responseType: "arraybuffer",
});
