# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build arguments for Expo public env vars
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY

# Set them as environment variables so the Expo bundler can embed them during build
ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY

# Copy package files
COPY package*.json ./

# Install dependencies (using --legacy-peer-deps to avoid conflict resolution issues)
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Export the static web bundle
RUN npx expo export --platform web

# Production stage
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static assets from build stage to Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
