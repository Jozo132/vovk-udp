// @ts-check
'use strict'

const UDP = require('../vovk-udp')

const host = 'localhost'
const port = 33333;

const request = 'Hello World!'

UDP.request(host, port, 'test 1')
    .then(response => {
        console.log(`Received response in ${response.latency} ms: Request("${response.request.toString()}") => Response("${response.message.toString()}")`)
        return response.reply('test 2')
    })
    .then(response => {
        console.log(`Received response in ${response.latency} ms: Request("${response.request.toString()}") => Response("${response.message.toString()}")`)
        return response.reply('test 3')
    })
    .then(response => {
        console.log(`Received response in ${response.latency} ms: Request("${response.request.toString()}") => Response("${response.message.toString()}")`)
        return response.reply('test 4')
    })
    .then(response => {
        console.log(`Received response in ${response.latency} ms: Request("${response.request.toString()}") => Response("${response.message.toString()}")`)
        return response.reply('test 5')
    })
    .then(response => {
        console.log(`Received response in ${response.latency} ms: Request("${response.request.toString()}") => Response("${response.message.toString()}")`)
    })
    .catch(err => {
        console.log(err)
    })