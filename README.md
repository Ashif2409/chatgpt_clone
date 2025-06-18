
# ChatGPT Clone

This is a ChatGPT Clone project built using Next.js, TypeScript, Tailwind CSS, and PNPM for package management.

## 📦 Project Info

- **Name**: chatgpt-clone
- **Version**: 0.1.0
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Package Manager**: PNPM

## 🚀 Getting Started
### Prerequisites

- Node.js (v16+ recommended)
- PNPM installed globally:  
  ```bash
  npm install -g pnpm
  ```
### Installation

    pnpm install --frozen-lockfile

### Development
    pnpm dev
    
### Build
  To start the production server:
  ```bash
  pnpm start
```

## 🛠️ Tech Stack

- **Next.js 15** with App Router
- **React 19**, TypeScript 5
- **Tailwind CSS 3**
- **shadcn/ui** + **Radix UI** + **Lucide Icons**
- **MongoDB 6**
- **Cloudinary v2** for file storage
- **OpenAI GPT-4o** via `@ai-sdk/openai`

---

## ⚙️ Environment Variables

Create a `.env.local` file:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/chatdb

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Node Environment
NODE_ENV=development
