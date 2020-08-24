// @ts-check
'use strict'

const UDP = require('../vovk-udp')

const host = 'localhost'
const port = 33333;

const multiple_messages = ['Hello World!', "It's a beautiful day!"]

UDP.sendMulti(host, port, multiple_messages).then(statuses => {
    statuses.forEach((status, i) => {
        const index = i + 1
        const latency = status.latency
        const message = status.message.toString()
        console.log(`Message [${index}] sent in ${latency} ms: "${message}"`)
    })
}).catch(err => {
    console.log(err)
})