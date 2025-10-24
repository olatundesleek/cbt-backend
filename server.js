import app from "./src/app.js";
import dotenv from "dotenv";
// dotenv.config();

if (process.env.NODE_ENV !== "production") {
  const envFile = `.env.${process.env.NODE_ENV || "development"}`;
  dotenv.config({ path: envFile });
}

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
