import { stringify } from "csv-stringify/sync";
import { parse } from "csv-parse/sync";
import fs from "fs";

// Template headers and sample data for question upload CSV
export const QUESTION_CSV_HEADERS = ["text", "options", "answer", "marks"];
export const QUESTION_CSV_SAMPLE = {
  text: "What is the capital of France?",
  options: JSON.stringify(["Paris", "London", "Berlin", "Madrid"]),
  answer: "Paris",
  marks: "1",
};

export function generateCsvTemplate() {
  const headers = QUESTION_CSV_HEADERS;
  const records = [headers, Object.values(QUESTION_CSV_SAMPLE)];
  return stringify(records);
}

// export function parseQuestionsCsv(filePath) {
//   const fileContent = fs.readFileSync(filePath, "utf-8");
//   const records = parse(fileContent, {
//     columns: true,
//     skip_empty_lines: true,
//   });

//   return records.map((record) => ({
//     text: record.text.trim(),
//     options: JSON.parse(record.options),
//     answer: record.answer.toString(),
//     marks: parseFloat(record.marks) || 1,
//   }));
// }

const isSafeFloat = (value) => {
  if (!Number.isFinite(value)) return false;
  if (value <= 0 || value > 3.4e38) return false;

  return Math.abs(value * 64 - Math.round(value * 64)) < 1e-9;
};

export function parseQuestionsCsv(filePath) {
  const fileContent = fs.readFileSync(filePath, "utf-8");

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((record, index) => {
    const parsedMarks = parseFloat(record.marks);

    if (!isSafeFloat(parsedMarks)) {
      throw new Error(
        `Invalid mark at row ${index + 2}: "${record.marks}"`
      );
    }

    return {
      text: record.text.trim(),
      options: JSON.parse(record.options),
      answer: record.answer.toString(),
      marks: parsedMarks,
    };
  });
}