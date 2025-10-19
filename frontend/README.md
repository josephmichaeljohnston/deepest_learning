# PowerPoint Processor with OpenAI Integration

A Next.js application that allows users to upload PowerPoint files and process them using OpenAI's API.

## Features

- 📁 **PowerPoint File Upload**: Support for .ppt and .pptx files
- 🤖 **OpenAI Integration**: Process uploaded files with AI
- 🎨 **Modern UI**: Clean, responsive interface with Tailwind CSS
- 🔒 **Type Safety**: Built with TypeScript

## Prerequisites

Before running this application, you need to have:

- **Node.js** (version 16 or later)
- **npm** or **yarn** package manager
- **OpenAI API Key**

## Installation

1. **Install Node.js** (if not already installed):
   - Download from [nodejs.org](https://nodejs.org/)
   - Or install via Windows Package Manager: `winget install OpenJS.NodeJS`

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file in the root directory and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

## Usage

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open your browser** and navigate to `http://localhost:3000`

3. **Upload a PowerPoint file** using the file upload interface

4. **Process with AI** to get insights about your presentation

## API Endpoints

- `POST /api/upload` - Upload PowerPoint files
- `POST /api/openai` - Process content with OpenAI
- `GET /api/openai` - Health check for OpenAI endpoint

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── openai/route.ts    # OpenAI API integration
│   │   │   └── upload/route.ts    # File upload handling
│   │   ├── globals.css            # Global styles
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Home page
│   └── components/
│       └── UploadPage.tsx         # File upload component
├── .github/
│   └── copilot-instructions.md    # GitHub Copilot instructions
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── tailwind.config.js             # Tailwind CSS configuration
└── next.config.js                 # Next.js configuration
```

## Development

- **Build**: `npm run build`
- **Start production**: `npm start`
- **Lint**: `npm run lint`

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **OpenAI API** - AI processing capabilities
- **React** - UI library

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |

## Notes

- Uploaded files are stored in the `uploads/` directory
- Only PowerPoint files (.ppt, .pptx) are accepted
- File size limits may apply based on your deployment environment