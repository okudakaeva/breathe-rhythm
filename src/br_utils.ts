import { brDict } from './br_dictionary';

export class BRUtils {
  public static extractFontSize (font: string): number {
    return BRUtils.parseFont(font)[1];
  }
  public static parseFont = (font: string): [weight: string, size: number, family: string] => {
    const match = font.match(/^((?:(?:normal|bold|italic|\d{3})\s+)+)?(\d+(?:\.\d+)?)px\s+(.+)$/i);

    if (!match) {
      return [
        brDict['BASE_FONT_WEIGHT'].toString(),
        brDict['BASE_FONT_SIZE'],
        brDict['BASE_FONT'],
      ];
    }

    return [
      (match[1] || '').trim() || brDict['BASE_FONT_WEIGHT'].toString(),
      parseFloat(match[2]),
      (match[3] || '').trim(),
    ];
  };
}
