FROM node:16.6.1-alpine3.14

WORKDIR /usr/app

COPY package*.json ./

RUN npm install

COPY . .
