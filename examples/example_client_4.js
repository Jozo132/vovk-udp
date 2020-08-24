// @ts-check
'use strict'

const UDP = require('../vovk-udp')

const host = 'localhost'
const port = 33333;

const multiple_requests = ['Hello World!', "It's a beautiful day!"]

UDP.requestMulti(host, port, multiple_requests).then(responses => {
    responses.forEach((response, i) => {
        const index = i + 1
        const latency = response.latency
        const request = response.request.toString()
        const message = response.message.toString()
        console.log(`Received response [${index}] in ${latency} ms: Request("${request}") => Response("${message}")`)
    })
}).catch(err => {
    console.log(err)
})