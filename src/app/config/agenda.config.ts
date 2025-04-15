// // file: src/config/agenda.ts

// import Agenda, { Job } from 'agenda';
// import mongoose from 'mongoose';
// // Chúng ta sẽ tạo file này ở bước sau, nhưng import trước để dùng
// import defineAllJobs from '../jobs/definitions';

// const AGENDA_COLLECTION = process.env.AGENDA_COLLECTION || 'agendaJobs'; // Lấy tên collection từ biến môi trường hoặc dùng mặc định

// /**
//  * Khởi tạo và cấu hình Agenda instance.
//  * Hàm này nên được gọi *sau khi* kết nối Mongoose thành công.
//  * @returns {Promise<Agenda>} Promise trả về Agenda instance đã được khởi tạo và bắt đầu.
//  * @throws {Error} Ném lỗi nếu kết nối Mongoose chưa sẵn sàng.
//  */
// async function setupAgenda(): Promise<Agenda> {
//   // Kiểm tra trạng thái kết nối Mongoose trước khi tiếp tục
//   // readyState: 0 = disconnected; 1 = connected; 2 = connecting; 3 = disconnecting
//   if (mongoose.connection.readyState !== 1) {
//     console.error('Lỗi: Kết nối Mongoose chưa sẵn sàng để khởi tạo Agenda.');
//     throw new Error('Mongoose connection not established before setting up Agenda.');
//   }

//   // Lấy đối tượng Db gốc từ kết nối Mongoose đang hoạt động
//   const mongoDb = mongoose.connection.db;
//   console.log(`Agenda sẽ sử dụng database: ${mongoDb?.databaseName}`);

//   // Khởi tạo Agenda instance
//   const agenda = new Agenda({
//     mongo: mongoDb, // Quan trọng: Truyền đối tượng Db để dùng chung connection pool
//     db: { collection: AGENDA_COLLECTION }, // Tên collection lưu trữ jobs
//     processEvery: '1 minute', // Tần suất Agenda kiểm tra DB (vd: 1 phút)
//     maxConcurrency: 20,       // Số job tối đa chạy đồng thời trên instance này
//     // defaultLockLifetime: 10 * 60 * 1000 // 10 phút (mặc định)
//   });

//   // --- Định nghĩa tất cả các Jobs ---
//   // Gọi hàm tổng hợp các định nghĩa job từ module khác
//   await defineAllJobs(agenda);

//   // --- Lắng nghe các sự kiện của Agenda (Tùy chọn nhưng hữu ích) ---
//   agenda.on('ready', () => console.log('Agenda processor is ready.'));
//   agenda.on('error', (err: any) => console.error('Agenda connection/processor error:', err));

//   // Có thể bắt thêm các sự kiện khác như 'start', 'complete', 'fail' để log chi tiết
//   agenda.on('start', (job: Job) => {
//     console.log(`Job [${job.attrs.name}] starting. ID: ${job.attrs._id}`);
//   });
//   agenda.on('complete', (job: Job) => {
//     console.log(`Job [${job.attrs.name}] finished successfully. ID: ${job.attrs._id}`);
//   });
//   agenda.on('fail', (err: Error, job: Job) => {
//     console.error(`Job [${job.attrs.name}] failed with error: ${err.message}. ID: ${job.attrs._id}. Data:`, job.attrs.data);
//     // Ở đây bạn có thể tích hợp logic gửi thông báo lỗi (ví dụ: Sentry, Slack, Email)
//   });

//   // --- Bắt đầu Agenda Processor ---
//   // Phải gọi start() để Agenda bắt đầu xử lý hàng đợi công việc
//   await agenda.start();
//   console.log('Agenda processor started.');

//   // Trả về instance đã cấu hình và khởi động
//   return agenda;
// }

// export default setupAgenda;
