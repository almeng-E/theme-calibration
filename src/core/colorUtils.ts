export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function calculateContrastRatio(foregroundHex: string, backgroundHex: string): number {
  const foreground = resolveColorOverBackground(parseHexColor(foregroundHex), parseHexColor(backgroundHex));
  const background = parseHexColor(backgroundHex);
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));

  return roundToTwo((lighter + 0.05) / (darker + 0.05));
}

export function calculateColorDistance(leftHex: string, rightHex: string): number {
  const left = parseHexColor(leftHex);
  const right = parseHexColor(rightHex);
  const distance = Math.sqrt(
    Math.pow(left.r - right.r, 2) +
      Math.pow(left.g - right.g, 2) +
      Math.pow(left.b - right.b, 2)
  );

  return roundToTwo(distance);
}

export function parseHexColor(hex: string): RgbaColor {
  const normalized = hex.trim();
  const match = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!match) {
    throw new Error(`Unsupported hex color: ${hex}`);
  }

  const value = match[1] || "";

  if (value.length === 3) {
    return {
      r: parseInt(value[0] + value[0], 16),
      g: parseInt(value[1] + value[1], 16),
      b: parseInt(value[2] + value[2], 16),
      a: 1
    };
  }

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
    a: value.length === 8 ? roundToTwo(parseInt(value.slice(6, 8), 16) / 255) : 1
  };
}

function relativeLuminance(color: RgbaColor): number {
  const channels = [color.r, color.g, color.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function resolveColorOverBackground(foreground: RgbaColor, background: RgbaColor): RgbaColor {
  if (foreground.a >= 1) {
    return foreground;
  }

  return {
    r: Math.round(foreground.r * foreground.a + background.r * (1 - foreground.a)),
    g: Math.round(foreground.g * foreground.a + background.g * (1 - foreground.a)),
    b: Math.round(foreground.b * foreground.a + background.b * (1 - foreground.a)),
    a: 1
  };
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
