// e:\JBAAI\src\app\utils\Localization.Util.ts

interface Translations {
  [key: string]: string;
}

interface LocaleData {
  [locale: string]: Translations;
}

const translations: LocaleData = {
  en: {
    low: "Low",
    normal: "Normal",
    high: "High",
    na: "N/A",
    errorCreatingEmail: "Error creating email content. Please try again later.",
    // Thêm các chuỗi dịch khác cho tiếng Anh ở đây
  },
  vi: {
    low: "Thấp",
    normal: "Bình thường",
    high: "Cao",
    na: "Không có dữ liệu",
    errorCreatingEmail: "Lỗi khi tạo nội dung email. Vui lòng thử lại sau.",
    // Thêm các chuỗi dịch khác cho tiếng Việt ở đây
  },
  ja: {
    low: "低",
    normal: "普通",
    high: "高",
    na: "該当なし",
    errorCreatingEmail:
      "メール作成中にエラーが発生しました。後でもう一度お試しください。",
  },
  ko: {
    low: "낮음",
    normal: "보통",
    high: "높음",
    na: "해당 없음",
    errorCreatingEmail:
      "이메일 내용 생성 중 오류가 발생했습니다. 나중에 다시 시도해 주세요.",
  },
  es: {
    low: "Bajo",
    normal: "Normal",
    high: "Alto",
    na: "N/D",
    errorCreatingEmail:
      "Error al crear el contenido del correo electrónico. Por favor, inténtelo de nuevo más tarde.",
  },
  fr: {
    low: "Bas",
    normal: "Normal",
    high: "Élevé",
    na: "N/D",
    errorCreatingEmail:
      "Erreur lors de la création du contenu de l'email. Veuillez réessayer plus tard.",
  },
};

/**
 * Lấy chuỗi dịch dựa trên ngôn ngữ và khóa.
 * @param language Mã ngôn ngữ (ví dụ: 'en', 'vi').
 * @param key Khóa của chuỗi cần dịch.
 * @returns Chuỗi đã dịch hoặc khóa nếu không tìm thấy bản dịch.
 */
export const getLocalizedString = (language: string, key: string): string => {
  const lang = language.toLowerCase();
  if (translations[lang] && translations[lang][key]) {
    return translations[lang][key];
  }
  // Fallback to English if the language or key is not found
  if (translations.en && translations.en[key]) {
    return translations.en[key];
  }
  // Fallback to the key itself if not found in English either
  return key;
};

export default translations;
