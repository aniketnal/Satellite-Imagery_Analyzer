# Satellite Imagery Analyzer

A professional geospatial analysis platform for development authorities and construction professionals to monitor urbanization, vegetation changes, water bodies, and environmental patterns.

## Features

- **Landing Page**: Professional introduction with rotating Earth visualization
- **Authentication**: Combined login/register page with Google and GitHub OAuth options
- **Dashboard**: Interactive map with Leaflet integration for area selection
- **Analysis Tools**: 
  - Polygon selection (click to add points, double-click to finish)
  - Rectangle selection (click twice for opposite corners)
  - Time period selection (Current, 3, 5, 7, 10 years)
  - Multiple analysis parameters (Deforestation, Vegetation, Urbanization, Water Bodies)
- **Report Generation**: Comprehensive analysis reports with interactive charts
- **User Profile**: View and manage user information

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Leaflet** + **React-Leaflet** - Interactive maps
- **Recharts** - Data visualization
- **Lucide React** - Icons

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## Usage

1. **Landing Page**: Start at the landing page and click "Get Started" or "Sign In"
2. **Authentication**: Register a new account or sign in (mock authentication)
3. **Dashboard**: 
   - Select an area selection tool (Polygon or Rectangle)
   - **Polygon**: Click multiple times to create vertices, double-click to complete
   - **Rectangle**: Click once for first corner, click again for opposite corner
   - Choose time period for analysis
   - Select analysis parameters (checkboxes)
   - Click "Get Analysis" to process
4. **View Report**: After analysis, view comprehensive report with charts and insights
5. **Download**: Download detailed reports (functionality placeholder)

## Drawing Tools Instructions

### Polygon Tool
1. Click "Polygon" button in sidebar
2. Click on the map to add points
3. Continue clicking to add more vertices
4. **Double-click** to complete the polygon
5. Use "Undo" to remove last shape or "Clear All" to remove all

### Rectangle Tool
1. Click "Rectangle" button in sidebar
2. Click once on the map (first corner)
3. Click again on the map (opposite corner)
4. Rectangle is automatically created
5. Use "Undo" to remove last shape or "Clear All" to remove all

## Project Structure

```
satellite-analyzer/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Input.jsx
│   │   └── Modal.jsx
│   ├── pages/           # Page components
│   │   ├── LandingPage.jsx
│   │   ├── AuthPage.jsx
│   │   ├── Dashboard.jsx      # Custom drawing implementation
│   │   ├── ProfilePage.jsx
│   │   └── ReportPage.jsx
│   ├── lib/             # Utilities
│   │   └── utils.js
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js
```


### Map not loading?
- Ensure you have an internet connection (map tiles load from OpenStreetMap)
- Check browser console for errors

### Shapes not appearing?
- Make sure to double-click to complete polygon

## License

MIT
