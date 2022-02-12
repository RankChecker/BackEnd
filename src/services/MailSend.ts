import nodemailer, { SendMailOptions } from "nodemailer";

class MailSend {
  #transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_ACCOUNT,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  async sendmail(to: string, subject: string, buffer?: Buffer) {
    let options: SendMailOptions = {
      from: process.env.GMAIL_ACCOUNT,
      to,
      subject,
      html: "<p>O relatório que você solicitou finalizou, baixe agora.</p>",
    };

    if (buffer)
      options = {
        ...options,
        attachments: [
          {
            filename: "Report.xlsx",
            content: buffer,
            contentType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        ],
      };

    try {
      await this.#transporter.sendMail(options);
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }
}

export default MailSend;
