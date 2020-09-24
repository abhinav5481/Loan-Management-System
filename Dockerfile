FROM node:8

WORKDIR /usr/src/app


# ENV PORT 8080
# ENV HOST 0.0.0.0

RUN mkdir -p /usr/src/app/functions

WORKDIR /usr/src/app/functions
COPY ./functions/package*.json ./

RUN npm install

RUN npm install -g firebase-tools

COPY ./functions .

WORKDIR /usr/src/app

COPY . .

EXPOSE 8080

# RUN firebase login --interactive

# CMD [ "firebase", "serve", "--project", "loan-management-redcarpet"]