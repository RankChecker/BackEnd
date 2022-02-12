import "dotenv/config";
import app from "./app";

let port = process.env.PORT || app.PORT;

app.server?.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
