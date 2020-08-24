// @ts-check
'use strict'

const UDP = require('../vovk-udp')

const host = 'localhost'
const port = 33333;

const request = 'Hello World!'

UDP.request(host, port, request).then(response => {
    const latency = response.latency
    const request = response.request.toString()
    const message = response.message.toString()
    console.log(`Received response in ${latency} ms: Request("${request}") => Response("${message}")`)
}).catch(err => {
    console.log(err)
})