# sameweb CLI

A powerful **CLI tool to clone websites and modify them with AI** using **Puppeteer + OpenAI**.  
With sameweb CLI, you can scrape websites, save them locally, and then use natural language queries to modify the cloned content — perfect for prototyping, experimentation, and rapid website iteration.

---

## ✨ Features

- 🌐 **Clone entire websites** into local folders with accurate DOM structure
- 🤖 **AI-powered modifications** using OpenAI GPT models
- 💬 **Interactive query mode** - ask the AI to modify your cloned website using natural language
- 🖥️ **Puppeteer-based scraping** for accurate rendering and resource fetching
- 📂 **Persistent state management** - remembers your cloned websites between sessions
- ⚡ **Simple command-line interface** with guided setup

---

## 🚀 Quick Start

### Installation

```bash
npm install -g sameweb-cli
# or using pnpm
pnpm add -g sameweb-cli
```

### First Run

Simply run the command to start the interactive setup:

```bash
sameweb
```

On first run, you'll be guided through:
1. **Website URL** - Enter the website you want to clone
2. **OpenAI API Key** - Provide your API key (or set `OPENAI_API_KEY` in `.env`)

### Example Workflow

```bash
$ sameweb
🚀 Welcome to sameweb-cli!
📌 First time setup: You need to clone a website.
🌐 Enter website URL to clone: https://example.com
🔑 Enter your OpenAI API key: sk-...
⚡ Cloning website, please wait...

✅ Website cloned successfully into 'https://example.com'. Now you can ask queries to modify it.

💬 Enter a query (or type 'exit' / 'reset' ): 
> Change the header color to blue and add a contact form
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in your project root to avoid entering your API key each time:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### State Management

sameweb CLI automatically saves your session state in `~/.sameweb-state.json`, including:
- Previously cloned website URL
- OpenAI API key
- Clone status

---

## 📋 Commands

### Interactive Mode

Once you've cloned a website, you can enter **natural language queries** to modify it:

- `"Change the background color to dark blue"`
- `"Add a navigation menu with Home, About, Contact links"`
- `"Remove all images and replace with placeholder text"`
- `"Make the layout responsive for mobile devices"`

### Special Commands

- **`exit`** - Quit the CLI
- **`reset`** - Clear saved state and start fresh (will require re-cloning)

---

## 🛠️ Development Setup

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/sameweb-cli.git
   cd sameweb-cli
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your OpenAI API key
   ```

4. **Run in development mode**
   ```bash
   node cli.js
   # or if you have a dev script
   npm run dev
   ```

### Project Structure

```
sameweb-cli/
├── cli.js          # Main CLI interface
├── cloner.js       # Core cloning and AI logic
├── package.json    # Dependencies and scripts
├── .env.example    # Environment template
└── README.md       # This file
```

---

## 🔑 API Key Setup

You'll need an **OpenAI API key** to use the AI modification features:

1. **Get API Key**: Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Set Environment Variable**: 
   ```bash
   export OPENAI_API_KEY=sk-your-key-here
   ```
   Or create a `.env` file as shown above

---

## 🤔 How It Works

1. **Clone Phase**: Uses Puppeteer to scrape the target website, capturing HTML, CSS, images, and other resources
2. **AI Integration**: Connects to OpenAI's API for processing modification requests
3. **Query Processing**: Takes your natural language input and applies changes to the cloned website
4. **State Persistence**: Remembers your setup between sessions for seamless continuation

---

## ⚠️ Requirements

- **Node.js** 16+ 
- **OpenAI API Key** (with sufficient credits)
- **Internet connection** for initial cloning and AI requests

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

---

## 💡 Tips

- **Complex queries**: Be specific about what you want to change for better AI results
- **Backup originals**: The tool modifies files in place, so keep backups if needed  
- **Large websites**: Cloning large sites may take time and consume API credits
- **State reset**: Use `reset` command if you want to start fresh with a new website

---

