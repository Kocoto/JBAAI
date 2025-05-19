import { Reader as MaxMindGeoIPReader, Country } from "@maxmind/geoip2-node";
import { geoIpDbBuffer } from "../config/geoip.config"; // Import buffer

// Định nghĩa kiểu dữ liệu trả về cho hàm tiện ích
export interface GeoIpInfo {
  countryCode?: string | null;
  countryName?: string | null;
  note?: string;
  error?: string;
  ip: string;
}

export function getCountryInfoFromIp(ip: string): GeoIpInfo {
  if (!geoIpDbBuffer) {
    console.error("[GeoIP Util] GeoIP Database Buffer is not available!");
    return { ip, error: "GeoIP service (database buffer) is not available." };
  }

  if (!ip || typeof ip !== "string" || ip.trim() === "") {
    console.warn(
      "[GeoIP Util] Invalid IP address provided: IP is empty or not a string."
    );
    return {
      ip: ip || "N/A",
      error: "Invalid IP address: IP is empty or not provided.",
    };
  }

  if (ip === "127.0.0.1" || ip === "::1" || ip.toLowerCase() === "localhost") {
    console.log(`[GeoIP Util] IP address is localhost: ${ip}`);
    return {
      ip,
      countryCode: "LH",
      countryName: "Localhost",
      note: "Loopback address",
    };
  }

  try {
    // Tạo một instance Reader mới từ buffer mỗi lần hàm được gọi
    const localReader = MaxMindGeoIPReader.openBuffer(geoIpDbBuffer);
    // console.log('[GeoIP Util] Local GeoIP Reader instance created from buffer.');

    const locationResponse: Country = localReader.country(ip); // TypeScript sẽ suy luận kiểu tốt ở đây

    const countryIsoCode = locationResponse?.country?.isoCode;
    const countryName = locationResponse?.country?.names.en;

    if (countryIsoCode) {
      return {
        ip,
        countryCode: countryIsoCode,
        countryName: countryName || "N/A",
      };
    } else {
      const registeredCountryIsoCode =
        locationResponse?.registeredCountry?.isoCode;
      const registeredCountryName =
        locationResponse?.registeredCountry?.names.en;
      if (registeredCountryIsoCode) {
        return {
          ip,
          countryCode: registeredCountryIsoCode,
          countryName: registeredCountryName || "N/A",
          note: "Registered country information.",
        };
      } else {
        return {
          ip,
          error: "Country information not found for this IP in the database.",
        };
      }
    }
  } catch (error: any) {
    console.error(
      `[GeoIP Util] GeoIP lookup error for IP ${ip}:`,
      error.message
    );
    if (error.name === "AddressNotFoundError") {
      return { ip, error: "IP address not found in GeoIP database." };
    } else if (error.name === "ValueError") {
      return { ip, error: "Invalid IP address format." };
    }
    return { ip, error: "An unexpected error occurred during GeoIP lookup." };
  }
}
