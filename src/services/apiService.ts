import axios from "axios";

export const ApiService = axios.create({
  responseType: "document",
  responseEncoding: "utf-8",
  validateStatus: () => true,
});
