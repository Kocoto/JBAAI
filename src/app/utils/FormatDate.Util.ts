import { setWeek, startOfWeek, endOfWeek, format } from "date-fns";

export const findWeek = async (weekNumver: number) => {
  try {
    const date = new Date();
    const year = date.getFullYear();
    const weekNumber = 1;
    // const options = { weekStartsOn: 1 };
    const dateInYear = new Date(year, 0, 1);
    const dateInWeek30 = setWeek(dateInYear, weekNumber, {
      weekStartsOn: 1,
      firstWeekContainsDate: 4,
    });
    const startOfWeek30 = startOfWeek(dateInWeek30, { weekStartsOn: 1 });
    const endOfWeek30 = endOfWeek(dateInWeek30, { weekStartsOn: 1 });
    return {
      start: format(startOfWeek30, "yyyy-MM-dd"),
      end: format(endOfWeek30, "yyyy-MM-dd"),
    };
  } catch (error) {}
};
