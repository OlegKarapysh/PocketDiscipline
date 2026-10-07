// Money is a whole number of hryvnias, so it shows no decimals. uk-UA grouping, no unit.
export const MONEY_FORMAT = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });
