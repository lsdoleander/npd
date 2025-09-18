
FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

RUN echo "go die docker, you p.o.s."

CMD ["npm", "start"]
