// types/pdf-parse.d.ts
declare module 'pdf-parse' {
  import { Buffer } from 'buffer';

  interface PDFInfo {
    numpages: number;
    numrender: number;
    info: Record<string, any>;
    metadata: any;
    version: string;
    text: string;
  }

  interface PDFOptions {
    version?: string;
    pagerender?: (pageData: any) => string | Promise<string>;
    max?: number;
    normalizeWhitespace?: boolean;
    disableCombineTextItems?: boolean;
  }

  function pdf(dataBuffer: Buffer | Uint8Array, options?: PDFOptions): Promise<PDFInfo>;

  export = pdf;
}
