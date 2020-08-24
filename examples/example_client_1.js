// @ts-check
'use strict'

const UDP = require('../vovk-udp')

const host = 'localhost'
const port = 33333;

const message = 'Hello World!'

UDP.send(host, port, message).then(status => {
    const latency = status.latency
    const message = status.message.toString()
    console.log(`Message sent in ${latency} ms: "${message}"`)
}).catch(err => {
    console.log(err)
})