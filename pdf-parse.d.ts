declare module 'pdf-parse' {
  interface PDFData {
    numpages: number
    text: string
    info: Record<string, any>
  }
  interface PDFOptions {
    max?: number
    pagerender?: (pageData: any) => Promise<string>
  }
  function pdfParse(buffer: Buffer, options?: PDFOptions): Promise<PDFData>
  export = pdfParse
}
