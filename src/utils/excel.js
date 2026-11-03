import ExcelJS from "exceljs";

const QUESTION_EXCEL_HEADERS = [
  "Question",
  "Option A",
  "Option B",
  "Option C",
  "Option D",
  "Answer",
  "Marks",
];
const ANSWER_LETTERS = ["A", "B", "C", "D"];

export async function generateQuestionExcelTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Questions");
  worksheet.columns = [
    { header: QUESTION_EXCEL_HEADERS[0], key: "question", width: 42 },
    { header: QUESTION_EXCEL_HEADERS[1], key: "optionA", width: 34 },
    { header: QUESTION_EXCEL_HEADERS[2], key: "optionB", width: 34 },
    { header: QUESTION_EXCEL_HEADERS[3], key: "optionC", width: 34 },
    { header: QUESTION_EXCEL_HEADERS[4], key: "optionD", width: 34 },
    { header: QUESTION_EXCEL_HEADERS[5], key: "answer", width: 14 },
    { header: QUESTION_EXCEL_HEADERS[6], key: "marks", width: 12 },
  ];

  const header = worksheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4E78" },
  };
  header.alignment = { vertical: "middle", wrapText: true };
  header.height = 24;

  worksheet.addRow({
    question: "What does HTML stand for?",
    optionA: "Hyper Text Markup Language",
    optionB: "High Text Machine Language",
    optionC: "Hyper Transfer Markup Language",
    optionD: "Home Tool Markup Language",
    answer: "A",
    marks: 1,
  });
  worksheet.getColumn("question").alignment = { vertical: "top", wrapText: true };
  worksheet.autoFilter = {
    from: "A1",
    to: "G1",
  };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  for (let rowNumber = 2; rowNumber <= 101; rowNumber += 1) {
    worksheet.getCell(`F${rowNumber}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"A,B,C,D"'],
      showErrorMessage: true,
      errorTitle: "Invalid answer",
      error: "Choose A, B, C or D.",
    };
  }

  return workbook;
}

const importError = (message) =>
  Object.assign(new Error(message), { status: 400 });

const getCellText = (cell, rowNumber, columnName) => {
  const value = cell.value;

  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (typeof value === "object" && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text).join("").trim();
  }

  throw importError(
    `Unsupported value in "${columnName}" at row ${rowNumber}`
  );
};

const isSafeMark = (value) => {
  if (value <= 0 || value > 3.4e38) return false;
  return Number.isInteger(value * 64);
};

export async function parseQuestionsExcel(filePath) {
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.readFile(filePath);
  } catch (error) {
    throw importError(`Unable to read Excel workbook: ${error.message}`);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw importError("The Excel workbook has no worksheets");

  const headerRow = worksheet.getRow(1);
  const headers = QUESTION_EXCEL_HEADERS.map((_, index) =>
    getCellText(headerRow.getCell(index + 1), 1, "header").toLowerCase()
  );
  const unexpectedHeader = Array.from(
    { length: Math.max(0, headerRow.cellCount - QUESTION_EXCEL_HEADERS.length) },
    (_, index) =>
      getCellText(
        headerRow.getCell(QUESTION_EXCEL_HEADERS.length + index + 1),
        1,
        "header"
      )
  ).find(Boolean);

  if (
    unexpectedHeader ||
    headers.some(
      (header, index) =>
        header !== QUESTION_EXCEL_HEADERS[index].toLowerCase()
    )
  ) {
    throw importError(
      `The first row must contain these columns in order: ${QUESTION_EXCEL_HEADERS.join(", ")}`
    );
  }

  const questions = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    for (
      let columnNumber = QUESTION_EXCEL_HEADERS.length + 1;
      columnNumber <= row.cellCount;
      columnNumber += 1
    ) {
      if (getCellText(row.getCell(columnNumber), rowNumber, "extra column")) {
        throw importError(`Unexpected data in row ${rowNumber}`);
      }
    }

    const values = QUESTION_EXCEL_HEADERS.map((header, index) =>
      getCellText(row.getCell(index + 1), rowNumber, header)
    );
    if (values.every((value) => value === "")) return;

    const [text, ...fields] = values;
    const [optionA, optionB, optionC, optionD, answer, marksValue] = fields;
    const options = [optionA, optionB, optionC, optionD];
    const missingColumn = QUESTION_EXCEL_HEADERS.find(
      (_, index) => values[index] === ""
    );

    if (missingColumn) {
      throw importError(
        `Missing "${missingColumn}" value at row ${rowNumber}`
      );
    }
    if (text.length < 10 || text.length > 1000) {
      throw importError(
        `Question at row ${rowNumber} must be between 10 and 1000 characters`
      );
    }
    if (!ANSWER_LETTERS.includes(answer)) {
      throw importError(
        `Answer at row ${rowNumber} must be one of A, B, C or D`
      );
    }

    const marks = Number(marksValue);
    if (!isSafeMark(marks)) {
      throw importError(
        `Invalid mark at row ${rowNumber}: "${marksValue}". Marks must be positive multiples of 1/64 (for example: 0.25, 0.5, 1, 1.25).`
      );
    }
    if (questions.length >= 100) {
      throw importError("A maximum of 100 questions can be uploaded at once");
    }

    questions.push({
      text,
      options,
      answer: options[ANSWER_LETTERS.indexOf(answer)],
      marks,
    });
  });

  if (questions.length === 0) {
    throw importError("The Excel workbook contains no questions");
  }

  return questions;
}
