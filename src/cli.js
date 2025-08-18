#!/usr/bin/env node

import readline from "readline";
import os from "os";
import fs from "fs";
import path from "path";
import { main } from "./cloner.js";
import dotenv from "dotenv";
dotenv.config();

// Path to state file in user home directory
export const STATE_FILE = path.join(os.homedir(), ".sameweb-state.json");

// Simple async prompt
function prompt(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    }),
  );
}

// Load state if exists
export function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    } catch (err) {
      console.error("⚠️ Failed to read state file, resetting...");
    }
  }
  return { cloned: false, url: null, apiKey: null };
}

// Save state
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

async function runCLI() {
  console.log("🚀 Welcome to sameweb-cli!");

  let state = loadState();

  // --- If no website cloned yet, force clone first ---
  if (!state.cloned) {
    console.log("📌 First time setup: You need to clone a website.");

    let url = await prompt("🌐 Enter website URL to clone: ");
    while (!url) {
      url = await prompt(
        "❌ URL is required. Please enter a valid website URL: ",
      );
    }

    let apiKey = process.env.OPENAI_API_KEY ?? "";
    if (!apiKey) {
      apiKey= await prompt("🔑 Enter your OpenAI API key(or create .env file(OPENAI_API_KEY) for direct import): ");
    }
    while (!apiKey) {
      apiKey = await prompt(
        "❌ API key is required. Please enter your OpenAI API key: ",
      );
    }

    console.log("⚡ Cloning website, please wait...\n");
    await main(url, apiKey, null);

    // Save state
    state = { cloned: true, url, apiKey };
    saveState(state);

    console.log(
      `\n✅ Website cloned successfully into '${url}'. Now you can ask queries to modify it.`,
    );
  } else {
    console.log(`📂 Detected cloned website: ${state.url}`);
    console.log("✅ You can directly ask queries to modify it.");
  }

  // --- Query loop ---
  while (true) {
    const input = await prompt(
      "\n💬 Enter a query (or type 'exit' / 'reset' ): ",
    );

    if (input.toLowerCase() === "exit") {
      console.log("👋 Goodbye! Thanks for using sameweb-cli.");
      break;
    }

    if (input.toLowerCase() === "reset") {
      console.log(
        "♻️ Resetting state... You will need to clone again next run.",
      );
      fs.unlinkSync(STATE_FILE);
      break;
    }

    await main(null, state.apiKey, input);
  }
}

runCLI();
