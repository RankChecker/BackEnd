import ExcelJS, { Workbook } from "exceljs";
import path from "path";

interface Words {
  position: number | string;
  keyword: string;
  page: number | string;
}

class ExcelGenerator {
  workbook = new ExcelJS.Workbook();
  worksheet = this.workbook.addWorksheet("Resultados");

  generate(client: string, site: string, words: Words[]) {
    this.worksheet.columns = [
      { header: "Palavra Chave", key: "keyword" },
      { header: "Página", key: "page" },
      { header: "Posição", key: "position" },
    ];

    words.forEach(({ keyword, page, position }) => {
      this.worksheet.addRow({ keyword, page, position });
    });
  }

  async export() {
    const filepath = path.join(__dirname, "../../", "report", "report.xlsx");
    await this.workbook.xlsx.writeFile(filepath);
    return filepath;
  }
}

export default ExcelGenerator;
