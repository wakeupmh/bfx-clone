FROM node:18-alpine

WORKDIR /app

COPY package.json .
RUN npm install

COPY src/ .

CMD ["node", "p2p-exchange.js"]
