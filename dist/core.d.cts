import { C as ConvertOptions, a as ConvertResult, M as Metadata } from './types-D43B_LsG.cjs';

declare function extractMetadata(html: string): Metadata;
declare function cleanHtml(html: string, selector?: string): string;
declare function convertHtml(html: string, options?: ConvertOptions): ConvertResult;
declare function convertFile(htmlPath: string, options?: ConvertOptions): Promise<void>;
declare function convertDir(dirPath: string, options?: ConvertOptions): Promise<string[]>;

export { ConvertOptions, ConvertResult, Metadata, cleanHtml, convertDir, convertFile, convertHtml, extractMetadata };
