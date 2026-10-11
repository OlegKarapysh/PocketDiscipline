// The grammar of a jar comment, in two steps: ENVELOPE strips the day-shift marker, the streak bonus
// and the "completed" flag around the text; the others classify what remains, first match wins, on a
// folded body (whitespace collapsed, lower case, ё→е). Anything none of them match is free text.

/** Day-shift marker, streak bonus and "completed" flag around the body. Always matches. */
export const ENVELOPE =
  /^\s*(?:\((?<shiftBefore>yes+terday|вчера)\)\s*)?(?<body>.*?)(?:\s*\((?<doneParen>completed)!?\)|\s+(?<doneWord>completed))?(?:\s*\(\+?(?<bonus>\d{1,3})%(?:\s*(?<shiftInBonus>yes+terday))?\)?)?(?:\s*\((?<shiftAfter>вчера|yes+terday)\))?\s*$/iu;

export const SCORE = /^(?<score>10|[1-9])\/10$/u;
export const POMODORO = /^поми[дл]ор(?:\s+(?<kind>работа|уч[её]ба))?(?:\s+(?<sessions>\d{1,2}))?$/iu;
export const TIMED = /^(?<label>\p{L}[\p{L}\s]*?)\s+(?<minutes>\d{1,2}):(?<seconds>[0-5]\d)$/iu;
export const COUNTED = /^(?<label>\p{L}[\p{L}\s]*?)\s+(?<count>\d{1,3})$/iu;
export const TOP_UP = /^поповнення рахунку банки$/iu;
export const GRADED =
  /^(?:(?<level>(?:очень\s+)?(?:л[её]гк(?:ий|ая)(?:\s+полная)?|контрастный|долгий))\s+)?(?<habit>\p{L}[\p{L}\s]*)$/iu;
