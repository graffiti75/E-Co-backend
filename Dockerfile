# Use official Node.js 18 slim image
FROM node:18-slim

# Set working directory
WORKDIR /Users/graffiti75/Desktop/React/E-Co-backend

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 8080

# Start the app
CMD ["node", "server.js"]