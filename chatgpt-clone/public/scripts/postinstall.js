// scripts/postinstall.js
import { copyFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const src = "node_modules/@dqbd/tiktoken/tiktoken_bg.wasm";
const dest = "public/tiktoken_bg.wasm";

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log("✔ tiktoken_bg.wasm copied to public/");
