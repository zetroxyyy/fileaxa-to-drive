FROM node:20-alpine
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY .npmrc ./

# Install dependencies with optimizations, including dev dependencies needed for build
RUN npm ci --no-audit --no-fund --prefer-offline

# Copy source code
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000
ENV NODE_OPTIONS="--max-old-space-size=512"
CMD ["npm", "start"]
