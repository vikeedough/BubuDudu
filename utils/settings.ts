export function formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split("-").map(Number);

    const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    function getOrdinal(n: number): string {
        if (n >= 11 && n <= 13) return `${n}th`;
        switch (n % 10) {
            case 1:
                return `${n}st`;
            case 2:
                return `${n}nd`;
            case 3:
                return `${n}rd`;
            default:
                return `${n}th`;
        }
    }

    return `${getOrdinal(day)} ${months[month - 1]} ${year}`;
}

export function dateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export function convertToDisplayDate(date: Date): string {
    const convertedDate = dateToYYYYMMDD(date);
    return formatDate(convertedDate);
}
