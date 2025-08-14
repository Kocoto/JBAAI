import axios from "axios";
import * as fs from "fs";
import * as path from "path";

const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

const GOOGLE_TRANSLATE_URL =
  "https://translation.googleapis.com/language/translate/v2";

const TRANSLATION_DIR = path.resolve(__dirname, "../../.cache/translations");

async function translateTextWithApiKey(
  text: string,
  targetLang: string,
  sourceLang = "en"
): Promise<string> {
  const response = await axios.post(GOOGLE_TRANSLATE_URL, null, {
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

function writeIfChanged(filePath: string, data: string) {
  if (fs.existsSync(filePath)) {
    const oldData = fs.readFileSync(filePath, "utf8");
    if (oldData === data) return;
  }
  fs.writeFileSync(filePath, data, "utf8");
}

export async function translateTextSmart(
  text: string,
  targetLang: string
): Promise<string> {
  if (!fs.existsSync(TRANSLATION_DIR)) {
    fs.mkdirSync(TRANSLATION_DIR, { recursive: true });
  }

  const langFilePath = path.join(TRANSLATION_DIR, `${targetLang}.json`);

  let translations: Record<string, string> = {};
  if (fs.existsSync(langFilePath)) {
    try {
      translations = JSON.parse(fs.readFileSync(langFilePath, "utf8"));
    } catch (err) {
      console.warn(`[TranslateUtil] Cannot parse file ${langFilePath}:`, err);
    }
  }

  if (translations[text]) {
    console.log("[TranslateUtil] Translate with cache");
    return translations[text];
  }

  const translated = await translateTextWithApiKey(text, targetLang);
  translations[text] = translated;

  console.log("[TranslateUtil] Translate with API");
  writeIfChanged(langFilePath, JSON.stringify(translations, null, 2));
  console.log(`[TranslateUtil] Saved: "${text}" → "${translated}"`);
  console.log(`[TranslateUtil] Saved to ${langFilePath}`);
  return translated;
}
