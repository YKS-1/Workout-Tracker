/**
 * Retrieve the month name from the month number from a zero-indexed value
 *
 * @param month Number value of the month (zero indexed)
 * @returns Corresponding mapping of the month value to the number (zero indexed)
 */
export function getFormattedMonth(month: number) {
	switch (month) {
		case 0:
			return 'January';
		case 1:
			return 'February';
		case 2:
			return 'March';
		case 3:
			return 'April';
		case 4:
			return 'May';
		case 5:
			return 'June';
		case 6:
			return 'July';
		case 7:
			return 'August';
		case 8:
			return 'September';
		case 9:
			return 'October';
		case 10:
			return 'November';
		case 11:
			return 'December';
		default:
			return 'Invalid month';
	}
}

/**
 * Fetch the 12-hour formatted hour time
 *
 * @param date Date object consisting of various date attributes
 * @returns Formatted 12-hour time with AM/PM indicator
 */
export function getFormattedHourTime(date: Date): string {
	let hours = date.getHours();
	const minutes = date.getMinutes();

	const period = hours >= 12 ? 'pm' : 'am';

	hours = hours % 12;
	if (hours === 0) hours = 12;

	const minutesStr = minutes.toString().padStart(2, '0');

	return `${hours < 10 ? `0${hours}` : hours}:${minutesStr} ${period}`;
}
