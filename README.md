# ⚡ Yarwin Redeem Pro

A **free, open-source** web application for bulk Yarwin gift code redemption. Load up to 50 accounts, enter a gift code, and redeem on all accounts simultaneously in under 2 seconds.

![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)

## Features

- **Bulk Redemption** - Redeem gift codes on all accounts simultaneously
- **Account Management** - Load, view, delete, and export accounts
- **Real-time Logging** - Detailed console-style logs with timestamps
- **Result Summary** - See exactly which accounts succeeded/failed and why
- **Data Persistence** - Accounts and logs survive page refreshes
- **Fast Execution** - All accounts processed in parallel
- **Dark Cyber Theme** - Clean, aesthetic dark UI

## Quick Deploy

### Railway.com (Recommended)

1. Fork this repository
2. Go to [Railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your forked repository
5. Click "Deploy" - Railway will auto-detect the Node.js app

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/yaarwin-redeem-pro.git
cd yaarwin-redeem-pro

# Install dependencies
npm install

# Start the server
npm start

# Open http://localhost:3000 in your browser
```

## Usage

1. **Go to Accounts tab** → Paste your accounts in `phone|password` format:
   ```
   9003901098|rahul2323
   9003901099|pass1234
   9003901100|mypassword
   ```
2. Click **Load Accounts** (supports both `|` and `:` separators)
3. **Go to Redeem tab** → Enter the gift code
4. Click **Redeem All Accounts** — all accounts login and redeem simultaneously!
5. Check **Logs** tab for detailed server responses

## File Structure

```
yaarwin-redeem-pro/
├── index.html          # Main frontend (HTML)
├── style.css           # Dark cyber theme styles
├── script.js           # Frontend logic & API calls
├── server.js           # Node.js/Express backend proxy
├── package.json        # Dependencies
├── railway.json        # Railway deployment config
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/login` | POST | Login to Yarwin account |
| `/api/redeem` | POST | Redeem gift code |
| `/api/register` | POST | Register new account (optional) |
| `/health` | GET | Health check |

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Proxy:** Built-in CORS proxy for Yarwin API
- **Deployment:** Railway.com ready

## License

MIT License - Free for personal and commercial use.

## Disclaimer

This is an open-source tool for educational purposes. Use responsibly and in accordance with Yarwin's Terms of Service.
