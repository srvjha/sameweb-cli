#!/usr/bin/env node
import { Command } from "commander";
import { main } from "./cloner.js";

const program = new Command();

program
  .name("sameweb") 
  .description("Clone any website into a local folder using AI + Puppeteer")
  .version("1.0.0");

program
  .argument("<url>", "Website URL to clone")
  .option("-k, --key <key>", "OpenAI API Key")
  .action(async (url, options) => {
    try {
      const apiKey = options.key || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "OpenAI API Key is required. Use --key or set OPENAI_API_KEY env variable."
        );
      }

      console.log("🚀 Starting website cloning...");
      await main(url, apiKey); // pass key instead of mutating env
    } catch (err) {
      console.error("❌ Error:", err.message);
    }
  });

program.parse(process.argv);
