# latest LTS node
FROM node:12

# form file structure
RUN mkdir -p /app/api

WORKDIR /app/api
COPY package*.json /app/api
RUN npm install
COPY . /app/api/

# expose app on port 3000 and start app
EXPOSE 3000
CMD ["npm", "start"]