import fs from "fs";
import { parse } from "csv-parse";

export const parseQuestionsCsv = (filePath) => {
  return new Promise((resolve, reject) => {
    const questions = [];

    fs.createReadStream(filePath)
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        })
      )
      .on("data", (row) => {
        // Expected CSV columns: text,option_a,option_b,option_c,option_d,answer,marks,bank_id
        const options = {
          a: row.option_a,
          b: row.option_b,
          c: row.option_c,
          d: row.option_d,
        };

        questions.push({
          text: row.text,
          options: options,
          answer: row.answer.toLowerCase(), // normalize to lowercase
          marks: parseInt(row.marks || "1"),
          bankId: parseInt(row.bank_id),
        });
      })
      .on("error", (error) => {
        reject(error);
      })
      .on("end", () => {
        resolve(questions);
      });
  });
};
