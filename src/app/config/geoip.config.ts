// src/app/config/geoip.config.ts

import * as fs from "fs";
import * as path from "path";

// Define the path to GeoIP database file
const GEOIP_PATH = path.join(
  __dirname,
  "..", // Giả sử file config nằm trong src/app/config
  "..", // Lên src/app
  "..", // Lên src
  "geoip-db", // Vào thư mục geoip-db cùng cấp với src
  "GeoLite2-Country.mmdb" // Đảm bảo bạn đang dùng DB Country nếu muốn gọi .country()
);

console.log("[GeoIP Config] __dirname:", __dirname);
console.log("[GeoIP Config] Attempting to load GeoIP DB from:", GEOIP_PATH);

let geoIpDbBuffer: Buffer | null = null;

try {
  if (fs.existsSync(GEOIP_PATH)) {
    geoIpDbBuffer = fs.readFileSync(GEOIP_PATH);
    console.log(
      `[GeoIP Config] GeoIP database read into buffer successfully. Buffer size: ${geoIpDbBuffer?.length} bytes.`
    );
  } else {
    console.warn(
      `[GeoIP Config] GeoIP database file NOT FOUND at: ${GEOIP_PATH}`
    );
  }
} catch (error) {
  console.error("[GeoIP Config] Error reading GeoIP database file:", error);
}

// Export chỉ buffer
export { geoIpDbBuffer };
