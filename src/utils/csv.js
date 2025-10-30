import { stringify } from "csv-stringify/sync";
import { parse } from "csv-parse/sync";
import fs from "fs";

// Template headers and sample data for question upload CSV
export const QUESTION_CSV_HEADERS = ["text", "options", "answer", "marks"];
export const QUESTION_CSV_SAMPLE = {
  text: "What is the capital of France?",
  options: JSON.stringify(["Paris", "London", "Berlin", "Madrid"]),
  answer: "0", // Index of the correct answer (0-based)
  marks: "1",
};

export function generateCsvTemplate() {
  const headers = QUESTION_CSV_HEADERS;
  const records = [headers, Object.values(QUESTION_CSV_SAMPLE)];
  return stringify(records);
}

export function parseQuestionsCsv(filePath) {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  return records.map((record) => ({
    text: record.text.trim(),
    options: JSON.parse(record.options),
    answer: parseInt(record.answer),
    marks: parseInt(record.marks) || 1,
  }));
}
