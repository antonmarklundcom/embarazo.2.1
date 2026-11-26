// One country's settings. Every field is a standard code, not free text, so a
// second country is a second object of the same type (see
// docs/CONTENT-COUNTRY-RULE.md). Facts with an official source (help lines,
// institutions, schedules) are added later, each with its source and date.
//
// `code` (ISO 3166-1 alpha-2) is deliberately not here yet: no existing module
// uses the bare country code, so it waits until one needs it.
export type Country = {
  /** BCP 47 language tag used for dates, numbers and text. */
  locale: string;
  /** ISO 4217 currency code. */
  currency: string;
  /** IANA time zone. */
  timeZone: string;
};
