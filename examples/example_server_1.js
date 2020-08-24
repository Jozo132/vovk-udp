// @ts-check
'use strict'

const PORT = 33333;

const UDP = require('../vovk-udp')
const server = new UDP.Server(PORT)

// Start server on given port (and optionally host)
server.start().then(console.log)

server.onData(incoming => {
    const { address, port, message } = incoming // Destruct the client request data
    console.log(`Got message from ${address}:${port}: "${message.toString()}"`) // Display data
})