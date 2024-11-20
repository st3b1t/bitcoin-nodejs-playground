FROM node:20-buster
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    libc6 \
    g++ \
    libzmq3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home

ENV HOST=172.17.0.1
ENV PORT=28332
ENV NODE_ENV=prod

COPY . .


RUN npm install --build-from-source

EXPOSE 8080

CMD ["node","zmq_tx_websocket_fastify.js"]
