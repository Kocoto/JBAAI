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
  // Thêm các ngôn ngữ khác nếu cần
  // fr: {
  //   low: "Bas",
  //   normal: "Normal",
  //   high: "Élevé",
  //   na: "N/D",
  // },
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
