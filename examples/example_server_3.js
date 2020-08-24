// @ts-check
'use strict'

const PORT = 33333;

const UDP = require('../vovk-udp')
const server = new UDP.Server(PORT)

// Start server on given port (and optionally host)
server.start().then(console.log)

server.onData((incoming, reply) => {
    const { address, port, message } = incoming // Destruct the client request data
    console.log(`Got message from ${address}:${port}: "${message.toString()}"`) // Display data
    reply(message).then(server.close) // Reply some message to the client and then close server
})