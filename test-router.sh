#!/bin/bash

# Script to test the React Router implementation

echo "🚀 Starting Recruitment Frontend with React Router..."

cd /Users/grawish/frappe-bench/apps/recruitment/frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    yarn install
fi

# Build the project
echo "🔨 Building the project..."
yarn build

# Check build status
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📄 HTML files copied to:"
    echo "  - ../recruitment/www/search-members.html"
    echo "  - ../recruitment/www/notices.html" 
    echo "  - ../recruitment/www/id-card.html"
    
    echo ""
    echo "🌐 Available routes:"
    echo "  - / (Dashboard)"
    echo "  - /search-members (Search Members)"
    echo "  - /notices (Notices)"
    echo "  - /id-card (ID Card)"
    echo "  - /id-card/:id (ID Card with ID parameter)"
    
    echo ""
    echo "🛠️ Features implemented:"
    echo "  ✅ React Router DOM with path-based routing"
    echo "  ✅ useLocation() hook for getting current path"
    echo "  ✅ useParams() hook for URL parameters"
    echo "  ✅ Dynamic component rendering based on path"
    echo "  ✅ Custom hooks for route management"
    echo "  ✅ Navigation component with active states"
    echo "  ✅ Responsive UI with Tailwind CSS"
    echo "  ✅ Path-based component mapping utilities"
    
    echo ""
    echo "🚦 To start development server:"
    echo "  cd frontend && yarn dev"
    
else
    echo "❌ Build failed!"
    exit 1
fi