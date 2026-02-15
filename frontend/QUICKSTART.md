# Quick Start Guide - Satellite Imagery Analyzer

## Getting Started in 3 Steps

### Step 1: Install Dependencies
Open your terminal in the project directory and run:
```bash
npm install
```

This will install all required packages including:
- React and React DOM
- React Router for navigation
- Leaflet for maps
- Recharts for data visualization
- Tailwind CSS for styling

### Step 2: Start Development Server
```bash
npm run dev
```

The application will start at `http://localhost:5173` (or another port if 5173 is occupied).

### Step 3: Explore the Application

**Landing Page** (`http://localhost:5173/`)
- Professional landing page with rotating Earth animation
- Click "Get Started" or "Sign In" to proceed

**Authentication** (`/auth`)
- Toggle between Login and Register
- Fill in credentials (any values work - it's mocked)
- Or click Google/GitHub buttons for mock OAuth
- Automatically redirects to Dashboard on success

**Dashboard** (`/dashboard`)
- Use the sidebar to:
  - Select drawing tool (Polygon or Rectangle)
  - Choose time period
  - Select analysis parameters
- Draw on the map to select an area
- Click "Get Analysis" button (bottom right)
- Wait for loading modal
- Click "View Report"

**Report Page** (`/report`)
- View analysis metrics
- Interactive charts showing trends
- Download report button
- Return to dashboard to analyze another area

**Profile** (`/profile`)
- Access from navbar (top right)
- View user information
- See usage statistics


### Dependencies Issues
If you encounter any issues:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Key Features to Test

1. **Area Selection**: Try both polygon and rectangle tools on the map
2. **Multi-Parameter Analysis**: Select multiple analysis parameters simultaneously
3. **Time Period Comparison**: Change time periods to see different data
4. **Responsive Charts**: Hover over charts to see detailed tooltips
5. **Navigation**: Test all navigation flows between pages

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist` directory.

To preview the production build:
```bash
npm run preview
```

## Technology Highlights

- **Vite**: Lightning-fast hot module replacement
- **Tailwind CSS**: Utility-first CSS with custom configuration
- **Leaflet**: Industry-standard mapping library
- **Recharts**: Beautiful, responsive charts
- **React Router**: Client-side routing

## Next Steps (Notes)

After exploring the demo:
1. Add real API endpoints in the Dashboard and Report pages
2. Implement actual authentication backend
3. Connect to real satellite imagery services
4. Add PDF export functionality
5. Implement user preferences storage


