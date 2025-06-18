// lib/tokenizer.ts

import { init, Tiktoken } from "@dqbd/tiktoken/init";
import { readFileSync } from "fs";
import { resolve } from "path";

let encoder: Tiktoken;

/**
 * Initializes and returns a singleton Tiktoken encoder instance.
 * This function handles loading the necessary .wasm file for the tokenizer.
 * In a serverless environment, it fetches the .wasm file from a public URL.
 * In a local/Node.js environment, it reads the file from the filesystem.
 */
export async function getTokenizer() {
  if (encoder) {
    return encoder;
  }

  // Check if we're in a serverless environment (e.g., Vercel)
  if (process.env.VERCEL) {
    // Fetch the .wasm file from the public URL
    const wasm = await fetch(new URL("/tiktoken_bg.wasm", process.env.VERCEL_URL!));
    await init((imports) => WebAssembly.instantiate(wasm, imports));
  } else {
    // Read the .wasm file directly from the filesystem in local development
    const wasmPath = resolve(process.cwd(), "node_modules/@dqbd/tiktoken/dist/tiktoken_bg.wasm");
    const wasm = readFileSync(wasmPath);
    await init((imports) => WebAssembly.instantiate(wasm, imports));
  }

  // For gpt-4o and gpt-4-turbo, use 'cl100k_base'
  // You need to load the vocab and special_tokens JSON files for cl100k_base
  const vocabPath = resolve(process.cwd(), "node_modules/@dqbd/tiktoken/encoders/cl100k_base.tiktoken_vocab.json");
  const specialTokensPath = resolve(process.cwd(), "node_modules/@dqbd/tiktoken/encoders/cl100k_base.tiktoken_special_tokens.json");
  const vocab = JSON.parse(readFileSync(vocabPath, "utf-8"));
  const special_tokens = JSON.parse(readFileSync(specialTokensPath, "utf-8"));
  encoder = new Tiktoken("cl100k_base", vocab, special_tokens);
  return encoder;
}