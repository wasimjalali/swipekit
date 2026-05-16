import type { ImageProvider, TextProvider } from './types';
import { AzureOpenAIProvider } from './providers/azure-openai';
import { AzureFluxProvider } from './providers/azure-flux';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { DemoImageProvider, DemoTextProvider } from './providers/demo';

export type TextProviderName = 'azure' | 'openai' | 'anthropic' | 'demo';
export type ImageProviderName = 'azure-flux' | 'demo';

const TEXT_PROVIDER_NAMES: ReadonlySet<TextProviderName> = new Set([
  'azure',
  'openai',
  'anthropic',
  'demo',
]);

const IMAGE_PROVIDER_NAMES: ReadonlySet<ImageProviderName> = new Set([
  'azure-flux',
  'demo',
]);

function resolveTextProviderName(): TextProviderName {
  const raw = (process.env.LLM_PROVIDER || 'demo').toLowerCase();
  if (TEXT_PROVIDER_NAMES.has(raw as TextProviderName)) {
    return raw as TextProviderName;
  }
  console.warn(`Unknown LLM_PROVIDER="${raw}", falling back to "demo"`);
  return 'demo';
}

function resolveImageProviderName(): ImageProviderName {
  const raw = (process.env.IMAGE_PROVIDER || 'demo').toLowerCase();
  if (IMAGE_PROVIDER_NAMES.has(raw as ImageProviderName)) {
    return raw as ImageProviderName;
  }
  console.warn(`Unknown IMAGE_PROVIDER="${raw}", falling back to "demo"`);
  return 'demo';
}

export function getTextProvider(): TextProvider {
  switch (resolveTextProviderName()) {
    case 'azure':
      return new AzureOpenAIProvider();
    case 'openai':
      return new OpenAIProvider();
    case 'anthropic':
      return new AnthropicProvider();
    case 'demo':
      return new DemoTextProvider();
  }
}

export function getImageProvider(): ImageProvider {
  switch (resolveImageProviderName()) {
    case 'azure-flux':
      return new AzureFluxProvider();
    case 'demo':
      return new DemoImageProvider();
  }
}

export function getProviders(): { text: TextProvider; image: ImageProvider } {
  return { text: getTextProvider(), image: getImageProvider() };
}

export type {
  TextProvider,
  ImageProvider,
  TextStructureInput,
  ImageGenerateInput,
  ImageGenerateResult,
  JsonSchema,
} from './types';
