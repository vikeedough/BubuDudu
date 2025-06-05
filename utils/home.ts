import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";

dayjs.extend(advancedFormat);

export const getDaysUntilNextBirthday = (birthday: string) => {
    const today = dayjs();
    const birthdate = dayjs(birthday);

    let nextBirthday = birthdate.year(today.year());

    if (nextBirthday.isBefore(today, "day")) {
        nextBirthday = nextBirthday.add(1, "year");
    }

    return nextBirthday.diff(today, "day");
};

export const getToday = () => {
    return dayjs().format("dddd, Do MMMM YYYY");
};

export const randomNumber = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
