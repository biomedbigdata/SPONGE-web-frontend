### STAGE 1: Build ###

# We label our stage as ‘builder’
FROM node:16-alpine as builder

#default base url for the website
ENV base_url=https://exbio.wzw.tum.de/sponge/

RUN mkdir /ng-app
WORKDIR /ng-app

COPY . .

## Install required dependencies
RUN npm ci

## Build the angular app in production mode and store the artifacts in dist folder

RUN npm run build --output-path=dist --base-href=${base_url}

### STAGE 2: Setup ###

FROM nginx:1.14.1-alpine

## Copy our default nginx config
COPY nginx/default.conf /etc/nginx/conf.d/

## Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

## From ‘builder’ stage copy over the artifacts in dist folder to default nginx public folder
COPY --from=builder /ng-app/dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
