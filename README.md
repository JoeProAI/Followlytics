# 🔥 Followlytics - X Follower Tracker

> **Powered by Daytona** - The ultimate X (formerly Twitter) follower tracking system that identifies unfollowers and provides detailed analytics using secure sandbox environments.

![Followlytics Dashboard](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Daytona Powered](https://img.shields.io/badge/Powered%20by-Daytona-blue)
![Next.js](https://img.shields.io/badge/Next.js-14+-black)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)

## 🚀 Revolutionary Features

### 🔒 **Daytona-Powered Architecture**
- **Isolated Sandbox Environments**: Each scan runs in a secure, dedicated Daytona sandbox
- **Browser Automation**: Playwright runs inside containers for undetectable X scraping
- **Auto-cleanup**: Sandboxes automatically delete after completion to save costs
- **Scalable**: Handle multiple concurrent scans without conflicts or detection

### ⚡ **Core Features**
- **Real-time Follower Tracking**: Monitor X followers with automated scanning
- **Unfollower Detection**: Instant notifications when someone unfollows you
- **Analytics Dashboard**: Beautiful UI with progress tracking and scan history
- **Secure Authentication**: Firebase Auth with email/password authentication
- **No API Limitations**: Bypass X's $42k/month Enterprise API requirement

## 🏗️ **Architecture Overview**

```mermaid
graph TD
    A[User Dashboard] --> B[Next.js API]
    B --> C[Daytona SDK]
    C --> D[Create Sandbox]
    D --> E[Install Playwright]
    E --> F[Run X Scraper]
    F --> G[Extract Followers]
    G --> H[Store Results]
    H --> I[Auto-delete Sandbox]
    I --> J[Return to Dashboard]
```

## 🛠️ **Tech Stack**

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 14+ with TypeScript & Tailwind CSS |
| **Backend** | Next.js API routes |
| **Database** | Firebase Firestore |
| **Authentication** | Firebase Auth |
| - **Browser Automation** | Playwright in Daytona sandboxes |
| **Sandbox Management** | Daytona SDK |
| **Deployment** | Vercel |

## 📋 **Prerequisites**

- **Node.js** (v18 or higher)
- **Daytona Account** with API key
- **Firebase Project** with Authentication and Firestore enabled
- **Git** for version control

## 🚀 **Quick Start**

### 1. Clone & Install
```bash
git clone https://github.com/JoeProAI/Followlytics.git
cd followlytics
npm install
```

### 2. Configure Environment
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:
```env
# Daytona Configuration (Already included!)
DAYTONA_API_KEY=dtn_420f8063b62966174107e84d48ecf5c1d7f5c680abf8a1cdd48348c020e5eaa9
DAYTONA_API_URL=https://app.daytona.io/api
DAYTONA_TARGET=us

# Firebase Configuration (Add your values)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
# ... (see .env.local.example for all variables)
```

### 3. Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3001](http://localhost:3001) 🎉

## 🔧 **Configuration Guide**

### Firebase Setup
1. Create project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password)
3. Create Firestore database
4. Generate service account key
5. Add credentials to `.env.local`

### Daytona Setup
✅ **Already configured!** Your API key is included and ready to use.

## 🎯 **How It Works**

1. **User enters X username** → Beautiful dashboard form
2. **Daytona creates sandbox** → Isolated environment with Playwright
3. **Browser automation runs** → Scrapes X followers page undetected
4. **Results processed** → Stored in Firebase, unfollowers detected automatically
5. **Sandbox auto-deletes** → Zero maintenance, cost-effective

## 📊 **Database Schema**

### Collections

#### `follower_scans`
```typescript
{
  userId: string
  xUsername: string
  scanDate: timestamp
  followers: string[]
  followerCount: number
  status: 'pending' | 'initializing' | 'setting_up' | 'scanning' | 'completed' | 'failed'
  progress: number
  sandboxId?: string
}
```

#### `unfollower_reports`
```typescript
{
  userId: string
  xUsername: string
  previousScanId: string
  currentScanId: string
  unfollowers: string[]
  newFollowers: string[]
  reportDate: timestamp
}
```

## 🌟 **Why Daytona?**

| Traditional Approach | Daytona-Powered |
|---------------------|-----------------|
| ❌ Browser detection issues | ✅ Fresh environment every scan |
| ❌ Rate limiting problems | ✅ Isolated IP addresses |
| ❌ Server maintenance | ✅ Zero maintenance |
| ❌ Scaling difficulties | ✅ Infinite scalability |
| ❌ Security concerns | ✅ Isolated sandboxes |

## 🚀 **Deployment - FORCE REBUILD**

### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod --force
```

Add environment variables in Vercel dashboard.

## 📝 **API Endpoints**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scan/followers` | POST | Start follower scan |
| `/api/scan/followers?scanId=xxx` | GET | Get scan status |
| `/api/scan/followers` | GET | List user scans |

## 🔒 **Security & Privacy**

- **Isolated Environments**: Each scan runs in a separate Daytona sandbox
- **No Data Persistence**: Sandboxes auto-delete after completion
- **Secure Storage**: All data encrypted in Firebase
- **Privacy Compliant**: GDPR and privacy regulation compliant

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 **License**

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## ⚠️ **Disclaimer**

This tool is for educational and personal use only. Please ensure compliance with X's Terms of Service. The use of browser automation is at your own risk.

## 🆘 **Support**

- 📧 **Issues**: [GitHub Issues](https://github.com/JoeProAI/Followlytics/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/JoeProAI/Followlytics/discussions)
- 📖 **Documentation**: [Wiki](https://github.com/JoeProAI/Followlytics/wiki)

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

Made with ❤️ using [Daytona](https://daytona.io) sandbox technology

[🚀 Get Started](#-quick-start) • [📖 Documentation](https://github.com/JoeProAI/Followlytics/wiki) • [🐛 Report Bug](https://github.com/JoeProAI/Followlytics/issues)

</div>
