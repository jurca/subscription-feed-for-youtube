
/**
 * Duration of a single second in milliseconds.
 *
 * @type {number}
 */
const SECOND = 1000; // milliseconds

/**
 * Duration of a single minute in milliseconds.
 *
 * @type {number}
 */
const MINUTE = 60 * SECOND;

/**
 * Duration of a single hour in milliseconds.
 *
 * @type {number}
 */
const HOUR = 60 * MINUTE;

/**
 * Duration of a single day in milliseconds.
 *
 * @type {number}
 */
const DAY = 24 * HOUR;

/**
 * Handy time representation and formatting utility class.
 */
export default class Time {
  /**
   * Creates a new {@linkcode Time} instance.
   *
   * @param {(string|number)=} value The time value. If number, represents the
   *        time in milliseconds. If string, the string may either contain a
   *        number (time in milliseconds) or a YouTube time string.
   */
  constructor(value = Date.now()) {
    if ((value instanceof Object) && value.hasOwnProperty("value")) {
      this.value = value.value;
    } else if (typeof value === "number") {
      this.value = value;
    } else if (typeof value === "string") {
      this.value = parseTime(value);
    } else {
      throw new Error("Invalid value");
    }

    Object.freeze(this);
  }

  /**
   * Returns the days part of this time.
   *
   * @return {number} The days.
   */
  get days(): number {
    return Math.floor(this.value / DAY);
  }

  /**
   * Returns the hours part of this time.
   *
   * @return {number} The hours.
   */
  get hours(): number {
    return Math.floor(this.value % DAY / HOUR);
  }

  /**
   * Returns the minutes part of this time.
   *
   * @return {number} The minutes.
   */
  get minutes(): number {
    return Math.floor(this.value % HOUR / MINUTE);
  }

  /**
   * Returns the seconds part of this time.
   *
   * @return {number} The seconds.
   */
  get seconds(): number {
    return Math.floor(this.value % MINUTE / SECOND);
  }

  /**
   * Returns the milliseconds part of this time.
   *
   * @return {number} The milliseconds.
   */
  get milliseconds(): number {
    return Math.floor(this.value % SECOND);
  }

  /**
   * Formats this time in localized format.
   *
   * @return {string} locally formatted time.
   */
  get formatted(): string {
    let hours = formatNumber(this.hours, 2);
    let minutes = formatNumber(this.minutes, 2);
    let seconds = formatNumber(this.seconds, 2);

    let time = `${hours}:${minutes}:${seconds}`;

    if (this.days) {
      return chrome.i18n.getMessage("Time_fullFormat", [this.days, time]);
    }

    return time;
  }
}

/**
 * Parses the provided time representing string into a value usable as a
 * {@linkcode Time} value.
 *
 * @param {string} value The string to parse.
 * @return {number} The parsed time.
 */
function parseTime(value: string): number {
  if (/^\d+$/.test(value)) {
    return parseInt(value, 10);
  }

  let youtubeMatcher = /^P(\d+D)?T(\d+H)?(\d+M)?(\d+S)?$/;
  if (youtubeMatcher.test(value)) {
    parts = youtubeMatcher.exec(value);

    let value = 0;
    if (parts[1]) {
      value += parseInt(parts[1], 10) * DAY;
    }
    if (parts[2]) {
      value += parseInt(parts[2], 10) * HOUR;
    }
    if (parts[3]) {
      value += parseInt(parts[3], 10) * MINUTE;
    }
    if (parts[4]) {
      value += parseInt(parts[4], 10) * SECOND;
    }

    return value;
  }

  throw new Error(`Invalid time format: ${value}`);
}

/**
 * Formats the provided number to a string that will contain at least the
 * specified number of digits.
 *
 * @param {number} number The number to format.
 * @param {number} digits The expected minimal number of digits.
 * @return {string} The formatted number.
 */
function formatNumber(number: number, digits: number): string {
  let formatted = number + "";

  while (formatted.length < digits) {
    formatted = "0" + formatted;
  }

  return formatted;
}
