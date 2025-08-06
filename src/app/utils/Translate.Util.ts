import axios from "axios";
import * as fs from "fs";
import * as path from "path";

const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const TRANSLATION_DIR = "./translations";

async function translateTextWithApiKey(
  text: string,
  targetLang: string,
  sourceLang = "en"
): Promise<string> {
  const url = `https://translation.googleapis.com/language/translate/v2`;

  const response = await axios.post(url, null, {
    params: {
      q: text,
      source: sourceLang,
      target: targetLang,
      format: "text",
      key: API_KEY,
    },
  });

  return response.data.data.translations[0].translatedText;
}

export async function translateTextSmart(
  text: string,
  targetLang: string
): Promise<string> {
  const langFilePath = path.join(TRANSLATION_DIR, `${targetLang}.json`);

  if (!fs.existsSync(TRANSLATION_DIR)) {
    fs.mkdirSync(TRANSLATION_DIR, { recursive: true });
  }

  let translations: Record<string, string> = {};
  if (fs.existsSync(langFilePath)) {
    translations = JSON.parse(fs.readFileSync(langFilePath, "utf8"));
  }

  if (translations[text]) {
    console.log("Translate with cache");
    return translations[text];
  }

  const translated = await translateTextWithApiKey(text, targetLang);
  translations[text] = translated;
  console.log("Translate with API");

  fs.writeFileSync(langFilePath, JSON.stringify(translations, null, 2), "utf8");
  console.log(`Translated and saved: "${text}": "${translated}"`);

  return translated;
}
