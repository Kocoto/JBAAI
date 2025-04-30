import { log } from "console";
import {
  setWeek,
  startOfWeek,
  endOfWeek,
  format,
  parseISO,
  parse,
  startOfDay,
  endOfDay,
  endOfMonth,
  startOfMonth,
} from "date-fns";

class HomeService {
  async test() {
    try {
      //   const date = new Date();
      //   const year = date.getFullYear();
      //   const weekNumber = 1;
      //   const options = { weekStartsOn: 1 };
      //   const dateInYear = new Date(year, 0, 1);
      //   const dateInWeek30 = setWeek(dateInYear, weekNumber, {
      //     weekStartsOn: 1,
      //     firstWeekContainsDate: 4,
      //   });
      //   const startOfWeek30 = startOfWeek(dateInWeek30, { weekStartsOn: 1 });
      //   const endOfWeek30 = endOfWeek(dateInWeek30, { weekStartsOn: 1 });
      //   console.log(
      //     `Tuần thứ ${weekNumber} của năm ${year} (bắt đầu từ Thứ Hai):`
      //   );
      //   console.log(`- Bắt đầu: ${format(startOfWeek30, "dd/MM/yyyy")}`);
      //   console.log(`- Bắt đầu: ${startOfWeek30.toISOString()}`);
      //   console.log(`- Kết thúc: ${endOfWeek30}`);
      //   console.log(`- Kết thúc: ${format(endOfWeek30, "dd/MM/yyyy")}`);
      const value = "1";
      let startDate: Date;
      let endDate: Date;
      const a = 2023;
      const monthNum = parseInt(value, 10);

      const dateInTargetMonth = new Date(a, monthNum - 1, 1);

      startDate = startOfMonth(dateInTargetMonth);
      endDate = endOfMonth(dateInTargetMonth);
      log(monthNum);
      log(dateInTargetMonth);
      const s = String(startDate);
      console.log(s);
      console.log(endDate);
    } catch (error) {}
  }
}

export default new HomeService();
