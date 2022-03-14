import axios from "axios";

export const ApiService = axios.create({
  headers: {
    Accept:
      "text/xml,application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5",
    "Cache-Control": "max-age=0",
    "Keep-Alive": "300",
    "Accept-Language": "pt",
    "Content-type": "UTF-8",
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36 OPR/38.0.2220.41",
  },
  responseType: "arraybuffer",
  validateStatus: () => false,
});
