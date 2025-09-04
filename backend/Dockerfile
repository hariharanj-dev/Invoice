# -----------------------
# Stage 1: Build
# -----------------------
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install --production

# Copy app source
COPY . .

# -----------------------
# Stage 2: Runtime
# -----------------------
FROM node:18-alpine

WORKDIR /app

# Copy only necessary files from build stage
COPY --from=build /app /app

# Expose the port your app runs on
EXPOSE 5000

# Set environment variables (Render will override these)
ENV NODE_ENV=production \
    PORT=5000

# Start the server
CMD ["node", "server.js"]
