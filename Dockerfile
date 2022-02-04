FROM node:16.6.2-alpine3.14

WORKDIR /usr/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npx prisma db push