export interface JsonSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: readonly string[];
  additionalProperties?: boolean;
  [key: string]: unknown;
}

export interface TextStructureInput {
  systemPrompt: string;
  userPrompt: string;
  jsonSchema: JsonSchema;
  schemaName?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface TextProvider {
  structure(input: TextStructureInput): Promise<unknown>;
}

export interface ImageGenerateInput {
  prompt: string;
  width: number;
  height: number;
  template?: string;
}

export interface ImageGenerateResult {
  dataUrl: string;
  safetyFiltered: boolean;
}

export interface ImageProvider {
  generate(input: ImageGenerateInput): Promise<ImageGenerateResult>;
}
