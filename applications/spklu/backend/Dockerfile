FROM node:alpine
WORKDIR "/app"
COPY ./package*.json ./
RUN npm install -g npm@8.19.2
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]