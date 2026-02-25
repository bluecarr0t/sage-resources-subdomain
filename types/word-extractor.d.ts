declare module 'word-extractor' {
  interface Document {
    getBody(): string;
    getHeaders?(options?: { includeFooters?: boolean }): string;
    getFootnotes?(): string;
    getEndnotes?(): string;
  }

  class WordExtractor {
    extract(input: string | Buffer): Promise<Document>;
  }

  export = WordExtractor;
}
