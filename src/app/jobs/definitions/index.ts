// file: src/app/jobs/definitions/index.ts

import { Agenda } from "agenda";
// Import hàm định nghĩa job subscription (sẽ tạo ngay sau đây)
import defineSubscriptionJobs from "./subscriptionJobs";
// Import các hàm định nghĩa job khác nếu có (ví dụ: reminderJobs)
// import defineReminderJobs from './reminderJobs';

/**
 * Hàm tổng hợp, gọi tất cả các hàm định nghĩa job cho Agenda.
 * @param agenda Agenda instance
 */
export default async function defineAllJobs(agenda: Agenda): Promise<void> {
  console.log("[Agenda] Defining jobs...");

  // Gọi hàm định nghĩa cho các job liên quan đến subscription
  await defineSubscriptionJobs(agenda);

  // Gọi các hàm định nghĩa cho các nhóm job khác ở đây
  // await defineReminderJobs(agenda);
  // await defineReportJobs(agenda);

  console.log("[Agenda] All jobs defined.");
}
