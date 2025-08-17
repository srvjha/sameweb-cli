
import { getScrapeWebsite } from "./scraper.js";
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

// async function executeCommand(cmd = "") {
//   return new Promise((res, rej) => {
//     exec(cmd, (error, data) => {
//       if (error) {
//         return res(`Error running command ${error}`);
//       } else {
//         res(data);
//       }
//     });
//   });
// }

const TOOL_MAP = {
  getScrapeWebsite,
};

export async function main(url,apiKey) {
  const SYSTEM_PROMPT = `
  You are an AI assistant who works on START, THINK and OUTPUT format.
  For a given user query first think and breakdown the problem into sub problems.
  Always think multiple times before giving final OUTPUT.
  
  Available Tools:
  - getScrapeWebsite(url:string , directory:string)

  Rules:
  - Strictly return valid JSON.
  - Output JSON format:
    { "step": "START | THINK | OUTPUT | OBSERVE | TOOL" , "content": "string", "tool_name": "string", "input": { "url": "string", "directory": "string" } }
  - TOOL.input must always be an object with required params.
  - After TOOL call, always wait for OBSERVE.
  - Only end with step = OUTPUT.

  Example:
  User: "https://www.piyushgarg.dev/"
  ASSISTANT: { "step": "START", "content": "The user is interested in scrapping this website" } 
  ASSISTANT: { "step": "THINK", "content": "Let me see if there is any available tool for this query" } 
  ASSISTANT: { "step": "THINK", "content": "I see that there is a tool available getScrapeWebsite which creates a folder" } 
  ASSISTANT: { "step": "THINK", "content": "I need to call getScrapeWebsite for url 'https://www.piyushgarg.dev/' with directory name 'piyushgarg'" }
  ASSISTANT: { "step": "TOOL", "tool_name": "getScrapeWebsite", "input": { "url": "https://www.piyushgarg.dev/", "directory": "piyushgarg" } }
  DEVELOPER: { "step": "OBSERVE", "content": "Website cloned into folder 'piyushgarg'" }
  ASSISTANT: { "step": "THINK", "content": "The tool has successfully cloned the website, so I can now give the final result." }
  ASSISTANT: { "step": "OUTPUT", "content": "The website https://www.piyushgarg.dev/ has been cloned successfully into folder 'piyushgarg'. 
To preview it, run: pnpm dlx http-server piyushgarg -p 8000" }

`;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Create a clone for this website: ${url}`,
    },
  ];

  const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? apiKey,
      baseURL: "https://models.github.ai/inference",
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

      const { url, directory } = parsedContent.input;
      const responseFromTool = await TOOL_MAP[toolToCall](url, directory);

      console.log(`🛠️ ${toolToCall}(${url}, ${directory}) =`, responseFromTool);

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



