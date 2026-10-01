// SVG chart axis labels are 11px Geist Mono (label-small on .pd-num). Every glyph, digits, spaces and
// ₴ alike, advances 0.6em, which is 6.6px, so a label's rendered width follows from its length.
// Chromium on Linux places glyphs on whole pixels, which makes that 7px: the room a label is given has
// to cover it, or the longest labels are clipped there while they fit on Windows.
export const AXIS_CHAR_WIDTH = 7;
