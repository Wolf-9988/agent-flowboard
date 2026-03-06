FROM node:20-alpine

RUN apk add --no-cache python3 make g++ sqlite-dev

# Create a non-root user and grant permissions
WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Change ownership to the non-root 'node' user
RUN chown -R node:node .

# Switch to the non-root user
USER node

EXPOSE 3000

CMD [ "npm", "start" ]
