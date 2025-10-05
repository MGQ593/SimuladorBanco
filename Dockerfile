
FROM node:20-slim

# Create app directory
WORKDIR /app

# Copy package manifest only, install production dependencies.
# We avoid installing devDependencies so the image stays small. The project uses `tsx` as a runtime loader
# (it's declared in dependencies) so we can start the app directly with it.
COPY package.json ./

# Install only production dependencies. If you use a lockfile add it to the COPY above
RUN npm install --omit=dev --no-audit --no-fund

# Copy app sources
COPY . .

# The app listens on 3000 (see server.js)
EXPOSE 3000

# Start the server using the local tsx binary so the TypeScript entry (src/index.tsx) can be imported.
CMD ["./node_modules/.bin/tsx", "server.js"]
