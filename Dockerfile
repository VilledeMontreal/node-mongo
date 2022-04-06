#==========================================
# Note : The "alpine" version doesn't work with Mongo mainly
# because we use mongodb-memory-server for testing.
#==========================================
FROM node:14.18.2

LABEL maintainer="Ville De Montreal"
ARG ENV=unknown
ARG GIT_COMMIT=unknown

# GIT label of the packaged code
LABEL GIT_COMMIT=${GIT_COMMIT}

# Work dir
WORKDIR /mtl/app

# Copies the project files
COPY . /mtl/app

RUN chmod +x ./run && \
  rm /bin/sh && ln -s /bin/bash /bin/sh && \
  echo "America/Montreal" > /etc/timezone && dpkg-reconfigure -f noninteractive tzdata && \
  printf "\\nalias ll=\"ls -la\"\\n" >> ~/.bashrc && \
  apt-get update && \
  apt-get -y install vim nano && \
  apt-get clean all && \
  rm -rf /var/lib/apt/lists/* && \
  npm install --no-cache && \
  ./run compile
