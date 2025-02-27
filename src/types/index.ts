// Types for processed documentation page
export interface ProcessedPage {
  url: string;
  title: string;
  content: string;
  links: string[];
  codeExamples: CodeExample[];
  apiSignatures: APISignature[];
  timestamp: string;
}

// Interface for code examples
export interface CodeExample {
  code: string;
  language: string;
  description: string;
}

// Interface for API signatures
export interface APISignature {
  name: string;
  signature: string;
  description: string;
}
