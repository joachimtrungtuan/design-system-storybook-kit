const HEX_COLOR = /^#([\da-f]{6})$/iu;
function clamp(value, minimum = 0, maximum = 1) {
    return Math.min(maximum, Math.max(minimum, value));
}
function srgbToLinear(value) {
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}
function linearToSrgb(value) {
    return value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
}
function channelToHex(value) {
    return Math.round(clamp(value) * 255)
        .toString(16)
        .padStart(2, "0")
        .toUpperCase();
}
export function normalizeHex(value) {
    const match = HEX_COLOR.exec(value);
    if (match?.[1] === undefined) {
        throw new TypeError(`Expected a six-digit hex colour, received ${JSON.stringify(value)}.`);
    }
    return `#${match[1].toUpperCase()}`;
}
export function hexToRgb(value) {
    const normalized = normalizeHex(value);
    return {
        red: Number.parseInt(normalized.slice(1, 3), 16) / 255,
        green: Number.parseInt(normalized.slice(3, 5), 16) / 255,
        blue: Number.parseInt(normalized.slice(5, 7), 16) / 255,
    };
}
export function rgbToHex(color) {
    return `#${channelToHex(color.red)}${channelToHex(color.green)}${channelToHex(color.blue)}`;
}
export function hexToOklch(value) {
    const rgb = hexToRgb(value);
    const red = srgbToLinear(rgb.red);
    const green = srgbToLinear(rgb.green);
    const blue = srgbToLinear(rgb.blue);
    const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
    const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
    const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
    const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const b = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    const hue = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
    return { lightness, chroma: Math.hypot(a, b), hue };
}
function oklchToRgbRaw(color) {
    const angle = (color.hue * Math.PI) / 180;
    const a = color.chroma * Math.cos(angle);
    const b = color.chroma * Math.sin(angle);
    const l = (color.lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (color.lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (color.lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return {
        red: linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        green: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        blue: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    };
}
function isInGamut(color) {
    const epsilon = 1e-7;
    return Object.values(color).every((channel) => channel >= -epsilon && channel <= 1 + epsilon);
}
export function oklchToHex(color) {
    const raw = oklchToRgbRaw(color);
    if (isInGamut(raw)) {
        return { hex: rgbToHex(raw), clipped: false };
    }
    let low = 0;
    let high = color.chroma;
    let clipped = oklchToRgbRaw({ ...color, chroma: 0 });
    for (let attempt = 0; attempt < 24; attempt += 1) {
        const chroma = (low + high) / 2;
        const candidate = oklchToRgbRaw({ ...color, chroma });
        if (isInGamut(candidate)) {
            low = chroma;
            clipped = candidate;
        }
        else {
            high = chroma;
        }
    }
    return { hex: rgbToHex(clipped), clipped: true };
}
export function hexToHsl(value) {
    const { red, green, blue } = hexToRgb(value);
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const delta = maximum - minimum;
    const lightness = (maximum + minimum) / 2;
    if (delta === 0) {
        return { hue: 0, saturation: 0, lightness };
    }
    const saturation = delta / (1 - Math.abs(2 * lightness - 1));
    let hue = maximum === red
        ? ((green - blue) / delta) % 6
        : maximum === green
            ? (blue - red) / delta + 2
            : (red - green) / delta + 4;
    hue = (hue * 60 + 360) % 360;
    return { hue, saturation, lightness };
}
export function hslToHex(color) {
    const chroma = (1 - Math.abs(2 * color.lightness - 1)) * color.saturation;
    const hue = ((color.hue % 360) + 360) % 360;
    const section = hue / 60;
    const x = chroma * (1 - Math.abs((section % 2) - 1));
    const [red, green, blue] = section < 1
        ? [chroma, x, 0]
        : section < 2
            ? [x, chroma, 0]
            : section < 3
                ? [0, chroma, x]
                : section < 4
                    ? [0, x, chroma]
                    : section < 5
                        ? [x, 0, chroma]
                        : [chroma, 0, x];
    const offset = color.lightness - chroma / 2;
    return rgbToHex({ red: red + offset, green: green + offset, blue: blue + offset });
}
//# sourceMappingURL=color.js.map