import { getScrapeWebsite } from "./scraper.js";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import { SYSTEM_PROMPT } from "../helper/system.prompt.js";
import { loadState } from "./cli.js";
import { exec } from "child_process";

dotenv.config();

async function executeCommand(command) {
  return new Promise((resolve) => {
    if (!command || typeof command !== "string") {
      return resolve({
        code: 1,
        stdout: "",
        stderr: "Invalid command: must be a non-empty string",
      });
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        return resolve({
          code: error.code ?? 1,
        });
      }
      resolve({
        code: 0,
      });
    });
  });
}


const TOOL_MAP = {
  getScrapeWebsite,
  loadState,
  executeCommand,
};

export async function main(url, apiKey, input) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `${url ? `Create a clone for this website: ${url}` : input}`,
    },
  ];

  const client = new OpenAI({
     apiKey: apiKey || process.env.OPENAI_API_KEY
  });

  while (true) {
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages,
    });

    let rawContent = await response.choices[0].message.content;
    let parsedContent;
    try {
      parsedContent = await JSON.parse(rawContent);
    } catch (err) {
      console.error("❌ Failed to parse JSON:", rawContent);
      break;
    }

    // Push assistant response to context
    messages.push({
      role: "assistant",
      content: JSON.stringify(parsedContent),
    });

    if (parsedContent.step === "START") {
      console.log("🔥", parsedContent.content);
      continue;
    }

    if (parsedContent.step === "THINK") {
      console.log("\t🧠", parsedContent.content);
      continue;
    }

    if (parsedContent.step === "TOOL") {
      const toolToCall = parsedContent.tool_name;

      if (!TOOL_MAP[toolToCall]) {
        messages.push({
          role: "developer",
          content: JSON.stringify({
            step: "OBSERVE",
            content: `No such tool: ${toolToCall}`,
          }),
        });
        continue;
      }

      let responseFromTool;

      // 👇 check which tool
      if (toolToCall === "getScrapeWebsite") {
        const { url, directory } = parsedContent.input;
        responseFromTool = await TOOL_MAP[toolToCall](url, directory);
        // console.log(
        //   `🛠️ ${toolToCall}(${url}, ${directory}) =`,
        //   responseFromTool,
        // );
      } else if (toolToCall === "executeCommand") {
        const { command } = parsedContent.input;
        responseFromTool = await TOOL_MAP[toolToCall](command);
        console.log(`🛠️ ${toolToCall}(${command}) =`, responseFromTool);
      } else if (toolToCall === "loadState") {
        responseFromTool = await TOOL_MAP[toolToCall]();
        console.log(`🛠️ ${toolToCall}() =`, responseFromTool);
      }

      messages.push({
        role: "developer",
        content: JSON.stringify({ step: "OBSERVE", content: responseFromTool }),
      });

      continue;
    }

    if (parsedContent.step === "OUTPUT") {
      console.log("🤖", parsedContent.content);
      break;
    }
  }

  console.log("✅ Agent finished");
}
