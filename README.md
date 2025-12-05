# 🐦 BirdDrop

**Privacy-first, peer-to-peer file sharing with a beautiful mobile-first design**

## ✨ Features

- 🔒 **Privacy First** - Direct P2P connection, no file storage on servers
- 🚀 **Fast Transfer** - WebRTC data channels for maximum speed
- 📱 **Mobile Optimized** - Beautiful, responsive design that works everywhere
- 🌍 **Geo Pairing** - Find and connect with nearby devices automatically
- 📷 **QR Code Pairing** - Quick pairing across rooms or networks
- 🎨 **Modern UI** - Smooth animations and intuitive interface
- 🔓 **No Limits** - Transfer files of any size
- 🎭 **Fun Names** - Temporary, memorable names for each session

## 🎨 Design Features

- **Gradient backgrounds** with smooth color transitions
- **Card-based layout** with rounded corners and shadows
- **Tab navigation** for easy switching between pairing methods
- **Real-time status indicators** with animated badges
- **Interactive animations** for better user feedback
- **Custom scrollbars** matching the app theme
- **Responsive icons** from Heroicons
- **Color-coded states** (green for connected, yellow for connecting, etc.)

## 🚀 Quick Start

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Production
```bash
# Backend
cd backend
npm start

# Frontend
cd frontend
npm run build
npm run preview
```

## 📱 Pairing Methods

### QR Code Pairing
1. Device A opens BirdDrop and selects "QR Code" tab
2. Device B scans the QR code
3. Both devices are now connected

### Nearby Pairing (Geo)
1. Both devices enable location services
2. Tap "Start Scanning" to find nearby devices
3. Select a device and tap "Connect"
4. Accept the pairing request
5. Start sharing files!

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, WebSocket (ws)
- **P2P**: WebRTC Data Channels
- **Styling**: Tailwind CSS with custom animations

## 🎯 Privacy & Security

- No file storage on servers
- Direct peer-to-peer connections
- Temporary session IDs
- No user tracking or analytics
- No account required

## 📄 License

Made with 💜 for privacy lovers
