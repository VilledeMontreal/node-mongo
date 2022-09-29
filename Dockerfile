#==========================================
# Note : The "alpine" version doesn't work with Mongo mainly
# because we use mongodb-memory-server for testing.
#==========================================
FROM node:lts-alpine

LABEL maintainer="Ville De Montreal"
ARG ENV=unknown
ARG GIT_COMMIT=unknown

# GIT label of the packaged code
LABEL GIT_COMMIT=${GIT_COMMIT}

# Work dir
WORKDIR /mtl/app

# Copies the project files
COPY . /mtl/app

RUN apk add --update bash tzdata && \
  rm -rf /var/cache/apk/* && \
  rm /bin/sh && ln -s /bin/bash /bin/sh && \
  cp /usr/share/zoneinfo/America/Montreal /etc/localtime && \
  echo "America/Montreal" >  /etc/timezone && \
  chown -R node:node /mtl && \
  chmod +x ./run && \
  npm install --no-cache && \
  ./run compile
