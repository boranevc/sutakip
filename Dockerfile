# Node.js 18 Alpine image
FROM node:18-alpine

# Working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build React app
RUN cd client && npm run build

# Expose port
EXPOSE 5000

# Start command
CMD ["node", "server/index-production.js"]
