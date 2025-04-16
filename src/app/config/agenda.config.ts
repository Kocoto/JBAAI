// file: src/config/agenda.ts

import Agenda, { Job, AgendaConfig } from "agenda"; // Import Agenda và các kiểu cần thiết
import mongoose from "mongoose";
// Import hàm định nghĩa jobs (sẽ tạo ở bước sau, nhưng import sẵn)
import defineAllJobs from "../jobs/definitions/index";

// Tên collection trong MongoDB mà Agenda sẽ sử dụng để lưu trữ thông tin jobs.
// Bạn có thể đặt tên khác nếu muốn. Lấy từ biến môi trường hoặc dùng tên mặc định.
const AGENDA_COLLECTION = process.env.AGENDA_COLLECTION || "agendaJobs";

/**
 * Hàm khởi tạo, cấu hình và bắt đầu Agenda instance.
 * Hàm này nên được gọi *sau khi* kết nối Mongoose đã thành công.
 *
 * @returns {Promise<Agenda>} Promise trả về Agenda instance đã được khởi tạo và sẵn sàng hoạt động.
 * @throws {Error} Ném lỗi nếu kết nối Mongoose chưa sẵn sàng hoặc có lỗi khi khởi tạo Agenda.
 */
async function setupAgenda(): Promise<Agenda> {
  console.log("Bắt đầu thiết lập Agenda...");

  // --- Kiểm tra kết nối Mongoose ---
  // Đảm bảo rằng Mongoose đã kết nối thành công trước khi tiếp tục.
  // readyState: 0 = disconnected; 1 = connected; 2 = connecting; 3 = disconnecting
  if (mongoose.connection.readyState !== 1) {
    console.error(
      "Lỗi: Kết nối Mongoose chưa sẵn sàng (readyState không phải 1). Không thể khởi tạo Agenda."
    );
    throw new Error(
      "Mongoose connection not established before setting up Agenda."
    );
  }
  console.log("Kiểm tra kết nối Mongoose: OK.");

  // --- Lấy đối tượng Db gốc từ Mongoose ---
  // Agenda cần đối tượng Db gốc từ driver MongoDB để hoạt động.
  // Lấy từ `mongoose.connection.db` giúp Agenda dùng chung connection pool
  // mà Mongoose đã tạo, tiết kiệm tài nguyên.
  const mongoDb = mongoose.connection.db;
  console.log(
    `Agenda sẽ sử dụng database: ${mongoDb.databaseName} và collection: ${AGENDA_COLLECTION}`
  );

  // --- Tạo và cấu hình Agenda Instance ---
  // Đây là nơi bạn định nghĩa các thông số hoạt động cho Agenda.
  const agendaConfig: AgendaConfig = {
    mongo: mongoDb, // **Quan trọng**: Cung cấp đối tượng Db đã kết nối.
    db: {
      collection: AGENDA_COLLECTION, // Tên collection lưu trữ jobs.
      // options: { useNewUrlParser: true } // Các tùy chọn cho driver nếu cần (thường không cần với cách này)
    },
    processEvery: "1 minute", // Tần suất Agenda 'thức dậy' kiểm tra database xem có job nào đến hạn chạy không.
    // Giá trị nhỏ hơn -> job được chạy gần đúng giờ hơn, nhưng tốn tài nguyên DB hơn.
    // Giá trị lớn hơn -> tiết kiệm tài nguyên hơn, nhưng job có thể bị trễ một chút so với lịch.
    // Ví dụ: '30 seconds', '5 minutes'.
    maxConcurrency: 20, // Số lượng job tối đa (bất kể loại nào) mà *instance Agenda này* có thể chạy đồng thời.
    // Giúp giới hạn tài nguyên CPU/RAM mà Agenda sử dụng. Mặc định là 20.
    defaultConcurrency: 5, // Số lượng job tối đa *của cùng một loại (cùng tên)* mà *instance Agenda này* có thể chạy đồng thời.
    // Mặc định là 5.
    lockLimit: 0, // Số lượng job tối đa *của cùng một loại (cùng tên)* có thể bị "khóa" (locked) trên *toàn bộ các instance Agenda* đang kết nối cùng DB.
    // 0 nghĩa là không giới hạn. Đặt giá trị > 0 nếu bạn muốn giới hạn tổng số instance chạy 1 loại job nào đó.
    defaultLockLifetime: 10 * 60 * 1000, // Thời gian (ms) mà một job bị khóa trước khi tự động mở khóa. Mặc định là 10 phút (600000 ms).
    // Đây là cơ chế an toàn: nếu một instance bị crash khi đang giữ khóa job,
    // sau thời gian này, job sẽ được mở khóa để instance khác có thể nhận xử lý.
    // Tăng giá trị này nếu bạn có những job chạy rất lâu (hơn 10 phút).
  };

  const agenda = new Agenda(agendaConfig);

  // --- Định nghĩa các loại Jobs mà Agenda có thể thực thi ---
  // Chúng ta sẽ gọi một hàm tổng hợp (sẽ tạo ở bước sau) để định nghĩa tất cả các jobs.
  // Việc này giúp giữ file config này gọn gàng.
  console.log("Đang định nghĩa các Agenda jobs...");
  await defineAllJobs(agenda); // Hàm này sẽ chứa các lệnh agenda.define(...)
  console.log("Đã định nghĩa xong các Agenda jobs.");

  // --- Lắng nghe các sự kiện quan trọng của Agenda ---
  // Giúp theo dõi và gỡ lỗi hoạt động của Agenda.
  agenda.on("ready", () =>
    console.log("Agenda processor is ready and connected to MongoDB.")
  );
  agenda.on("error", (err) =>
    console.error("Agenda encountered an error:", err)
  );

  // Các sự kiện hữu ích khác để log (tùy chọn):
  agenda.on("start", (job: Job) => {
    // Log khi một job bắt đầu chạy
    console.log(
      `[Agenda] Job <${job.attrs.name}> starting. ID: ${job.attrs._id}`
    );
  });
  agenda.on("complete", (job: Job) => {
    // Log khi một job hoàn thành thành công
    console.log(
      `[Agenda] Job <${job.attrs.name}> completed successfully. ID: ${job.attrs._id}`
    );
  });
  agenda.on("fail", (err: Error, job: Job) => {
    // Log khi một job thất bại
    // Ghi lại cả lỗi và dữ liệu của job để dễ dàng debug
    console.error(
      `[Agenda] Job <${job.attrs.name}> failed. ID: ${job.attrs._id}. Error: ${err.message}. Data:`,
      job.attrs.data
    );
    // Ở đây bạn có thể tích hợp gửi thông báo lỗi đến hệ thống monitoring (Sentry, Slack,...)
  });

  // --- Bắt đầu tiến trình xử lý của Agenda ---
  // **Rất quan trọng**: Phải gọi `agenda.start()` để Agenda bắt đầu
  // kiểm tra database và thực thi các jobs đến hạn.
  await agenda.start();
  console.log("Agenda processor successfully started.");

  // Trả về instance Agenda đã được cấu hình và khởi động
  return agenda;
}

// Export hàm setup để có thể gọi từ file khác (vd: index.ts)
export default setupAgenda;
