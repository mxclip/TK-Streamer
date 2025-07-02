#!/bin/bash

# TikTok Streamer Helper System Startup Script
echo "🚀 === TikTok Streamer Helper System Startup ==="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if port is available
check_port() {
    if lsof -i:$1 > /dev/null; then
        echo -e "${YELLOW}Port $1 is already in use${NC}"
        return 1
    else
        return 0
    fi
}

# Function to start backend
start_backend() {
    echo -e "${BLUE}🔧 Starting Backend Server...${NC}"
    
    # Kill existing backend processes
    pkill -f "uvicorn" 2>/dev/null || true
    sleep 2
    
    if check_port 8000; then
        cd backend
        
        # Set PYTHONPATH and start backend
        export PYTHONPATH=$(pwd):$PYTHONPATH
        
        echo -e "${GREEN}✅ Starting FastAPI server on port 8000...${NC}"
        python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
        BACKEND_PID=$!
        
        # Wait for backend to start
        echo "⏳ Waiting for backend to start..."
        sleep 5
        
        # Test backend health
        if curl -s http://localhost:8000/health > /dev/null; then
            echo -e "${GREEN}✅ Backend started successfully${NC}"
        else
            echo -e "${RED}❌ Backend failed to start${NC}"
            return 1
        fi
        
        cd ..
    else
        echo -e "${RED}❌ Port 8000 is busy, cannot start backend${NC}"
        return 1
    fi
}

# Function to start frontend
start_frontend() {
    echo -e "${BLUE}🌐 Starting Frontend Server...${NC}"
    
    # Kill existing frontend processes
    pkill -f "react-scripts" 2>/dev/null || true
    sleep 2
    
    if check_port 3000; then
        cd frontend
        
        # Check if node_modules exists
        if [ ! -d "node_modules" ]; then
            echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
            npm install
        fi
        
        # Clear cache
        echo "🧹 Clearing cache..."
        rm -rf node_modules/.cache
        
        echo -e "${GREEN}✅ Starting React development server on port 3000...${NC}"
        npm start &
        FRONTEND_PID=$!
        
        # Wait for frontend to start
        echo "⏳ Waiting for frontend to start..."
        sleep 10
        
        # Test frontend
        if curl -s http://localhost:3000 > /dev/null; then
            echo -e "${GREEN}✅ Frontend started successfully${NC}"
        else
            echo -e "${YELLOW}⚠️ Frontend may still be starting...${NC}"
        fi
        
        cd ..
    else
        echo -e "${RED}❌ Port 3000 is busy, cannot start frontend${NC}"
        return 1
    fi
}

# Function to show system status
show_status() {
    echo -e "\n${BLUE}🎯 === System Status ===${NC}"
    echo -e "${GREEN}Backend API:${NC} http://localhost:8000"
    echo -e "${GREEN}Frontend UI:${NC} http://localhost:3000"
    echo -e "${GREEN}API Docs:${NC} http://localhost:8000/docs"
    echo -e "${GREEN}Health Check:${NC} http://localhost:8000/health"
    
    echo -e "\n${BLUE}📋 Default Login Credentials:${NC}"
    echo "Email: admin@example.com"
    echo "Password: changethis"
    
    echo -e "\n${BLUE}🛠️ Management Commands:${NC}"
    echo "Stop all: pkill -f 'uvicorn|react-scripts'"
    echo "Backend logs: tail -f backend/logs/app.log"
    echo "Frontend only: cd frontend && npm start"
    echo "Backend only: cd backend && python -m uvicorn app.main:app --reload"
}

# Main execution
case "$1" in
    "backend")
        start_backend
        ;;
    "frontend") 
        start_frontend
        ;;
    "status")
        show_status
        ;;
    "stop")
        echo "🛑 Stopping all services..."
        pkill -f "uvicorn" 2>/dev/null || true
        pkill -f "react-scripts" 2>/dev/null || true
        echo "✅ All services stopped"
        ;;
    *)
        echo -e "${BLUE}🚀 Starting full TikTok Streamer System...${NC}"
        
        # Start backend first
        if start_backend; then
            echo ""
            # Start frontend
            if start_frontend; then
                echo ""
                show_status
                
                echo -e "\n${GREEN}🎉 System started successfully!${NC}"
                echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
                
                # Wait for interrupt
                trap 'echo -e "\n🛑 Stopping services..."; pkill -f "uvicorn|react-scripts"; exit 0' INT
                wait
            else
                echo -e "${RED}❌ Frontend failed to start${NC}"
                pkill -f "uvicorn" 2>/dev/null || true
                exit 1
            fi
        else
            echo -e "${RED}❌ Backend failed to start${NC}"
            exit 1
        fi
        ;;
esac 