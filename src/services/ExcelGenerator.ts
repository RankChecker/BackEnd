import ExcelJS, { Workbook } from "exceljs";
import path from "path";

interface Words {
  position: number;
  keyword: string;
  page: number;
}

class ExcelGenerator {
  workbook = new ExcelJS.Workbook();
  worksheet = this.workbook.addWorksheet("Resultados");

  generate(client: string, site: string, words: Words[]) {
    //Define os cabeçalhos da tabela
    this.worksheet.columns = [
      { header: "Palavra Chave", key: "keyword", width: 100 },
      { header: "Página", key: "page", width: 25 },
      { header: "Posição", key: "position", width: 25 },
    ];

    //Define cabeçalho com nome do cliente
    this.worksheet.mergeCells("A1", "C1");
    this.worksheet.getCell("A1").font = {
      name: "Arial Black",
      family: 4,
      color: { argb: "18243B" },
      size: 24,
      bold: true,
    };
    this.worksheet.getCell("A1").alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    this.worksheet.getCell("A1").value = client;

    //Define o site do cliente
    this.worksheet.mergeCells("A2", "C2");
    this.worksheet.getCell("A2").alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    this.worksheet.getCell("A2").value = site;

    this.worksheet.getRow(4).values = ["Palavra Chave", "Página", "Posição"];

    words.forEach(({ keyword, page, position }) => {
      this.worksheet.addRow({
        keyword,
        page: page >= 0 ? page + 1 : "Não encontrado",
        position: position >= 0 ? position + 1 : "Não encontrado",
      });
    });
  }

  async export() {
    const filepath = path.join(__dirname, "../../", "report", "report.xlsx");
    await this.workbook.xlsx.writeFile(filepath);
    const buffer = await this.workbook.xlsx.writeBuffer();
    return buffer;
  }
}

export default ExcelGenerator;
