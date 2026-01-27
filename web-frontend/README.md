# 🌐 Company Admin Web Frontend

A comprehensive React web application for company administrators to manage attendance, money requests, and generate detailed reports with advanced data visualizations.

## ✨ Features

### 💰 Money Management (Wallet & Advances)
- **User Cards View** with pending request indicators
- **Left-side ribbon** for pending requests (matching mobile app)
- **Search & Filter** by user, date range, amount
- **Sort** by date, amount, or name
- **Approve/Reject** requests with one click
- **User-specific history** view
- **Real-time statistics** dashboard
- **CSV Export** functionality

### 📊 Attendance History
- **Icon-only header** buttons (User, Date Range, Export)
- **User selection** modal
- **Date range filters** (Today, Week, Month, Custom)
- **Search employees** by name
- **Comprehensive CSV Export** (Attendance + Money Requests)
- **Detailed attendance cards**
- **Statistics dashboard**

### 📈 Advanced Visualizations
- **Recharts** - Line, Bar, Pie, Area charts
- **Visx** - Heatmaps, Network graphs
- **D3.js** - Custom interactive visualizations
- **Real-time data** updates
- **Interactive tooltips** and legends

### 🔐 Authentication
- Firebase Authentication
- Role-based access control
- Protected routes
- Session management

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Firebase project with Firestore enabled

### Installation

1. **Navigate to the web frontend directory:**
```bash
cd web-frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure Firebase:**
Create a `.env` file in the root directory:
```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

4. **Start the development server:**
```bash
npm start
```

The app will open at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## 📁 Project Structure

```
web-frontend/
├── src/
│   ├── components/          # Reusable components
│   │   ├── charts/         # Chart components (Recharts, Visx, D3)
│   │   ├── money/          # Money management components
│   │   ├── attendance/     # Attendance components
│   │   ├── layout/         # Layout components (Navbar, Sidebar)
│   │   └── common/         # Common UI components
│   ├── pages/              # Page components
│   │   ├── Dashboard.jsx
│   │   ├── MoneyManagement.jsx
│   │   ├── AttendanceHistory.jsx
│   │   └── Login.jsx
│   ├── services/           # API services
│   │   ├── firebase.js
│   │   ├── money.service.js
│   │   ├── attendance.service.js
│   │   └── export.service.js
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── styles/             # Global styles
│   └── App.js              # Main app component
├── public/
├── .env                    # Environment variables
└── package.json
```

## 🎨 Key Technologies

- **React 19** - UI framework
- **Firebase** - Backend (Auth, Firestore, Storage)
- **Recharts** - Main charting library
- **Visx** - Advanced visualizations
- **D3.js** - Custom interactive charts
- **React Router** - Navigation
- **date-fns** - Date manipulation
- **Papa Parse** - CSV export/import
- **Framer Motion** - Animations

## 📊 Data Visualization Examples

### Money Distribution (Pie Chart)
```jsx
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Approved', value: 50000 },
  { name: 'Pending', value: 20000 },
  { name: 'Rejected', value: 5000 }
];
```

### Attendance Trend (Line Chart)
```jsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
```

### Activity Heatmap (Visx)
```jsx
import { HeatmapCircle } from '@visx/heatmap';
```

## 🔒 Security

- Environment variables for sensitive data
- Firebase security rules
- Role-based access control
- Protected routes
- Input validation
- XSS protection

## 📱 Responsive Design

- Mobile-first approach
- Tablet optimization
- Desktop layouts
- Touch-friendly UI
- Adaptive components

## 🚀 Deployment

### Deploy to Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase:
```bash
firebase init hosting
```

4. Build and deploy:
```bash
npm run build
firebase deploy
```

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

## 📝 Features Roadmap

- [ ] Real-time notifications
- [ ] Email reports
- [ ] PDF export
- [ ] Advanced analytics
- [ ] Team management
- [ ] Custom dashboards
- [ ] Mobile app integration
- [ ] Multi-language support

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@yourcompany.com or open an issue in the repository.

## 🎉 Acknowledgments

- React team for the amazing framework
- Firebase for backend services
- Recharts, Visx, and D3.js communities
- All contributors and testers

---

**Built with ❤️ for Company Admins**
