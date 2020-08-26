// @ts-check
'use strict'

const dgram = require('dgram')
const { isArray } = Array

/** @typedef { import("dgram").Socket } UDP_Socket UDP Socket*/
/** @typedef { String | ArrayBuffer | SharedArrayBuffer } UDP_messageInput Acceptable UDP message input format */
/** @typedef { ArrayBuffer | SharedArrayBuffer } UDP_messageOutput Acceptable UDP message output format */
/** @typedef {{ message: UDP_messageInput, latency: Number }} UDP_sendResponse UDP promise response format of the 'send' command */
/** @typedef {{ message: UDP_messageOutput, request: UDP_messageInput, reply: (message: UDP_messageInput) => Promise<UDP_requestResponse>, latency: Number }} UDP_requestResponse UDP promise response format of the 'request' command */
/** @typedef {{ address: String, port: Number, message: UDP_messageOutput }} UDP_ClientData UDP Client event message data */
/** @typedef { (message: UDP_messageInput) => Promise<UDP_messageOutput> } UDP_ClientCallback UDP Client callback function to reply to the given request */


/** @param { UDP_messageInput } message * @param { UDP_Socket } socket * @param { String } address * @param { Number } port * @returns { Promise } UDP Reply Promise */
const UDP_send = (message, socket, address, port) => new Promise((resolve, reject) => {
    try {
        const reply = Buffer.from(message)
        socket.send(reply, 0, reply.length, port, address, err => {
            if (err) reject(err)
            else resolve(`UDP message sent!`)
        })
    } catch (e) { reject(e) }
})

class Server {
    /** 
     * UPD server
     * @param { Number } port Port on which the server will run
     * @param { String } [host] Hostname/IP on which the server will run [Default: 'localhost']
     */
    constructor(port, host) {
        /** @type {{ 
         * socket: UDP_Socket; 
         * host: String; 
         * port: Number; 
         * listenning: Boolean; 
         * callback: (data: UDP_ClientData, reply: UDP_ClientCallback) => void;
         * error: (error: any) => void;
         * messageEventListener;
         * errorEventListener;
         * }} */
        this.__config__ = {
            socket: dgram.createSocket('udp4'),
            host: host || 'localhost',
            port: port || 8080,
            listenning: false,
            callback: (data, res) => { },
            error: (e) => { },
            messageEventListener: (message, remote) => {
                const incoming = {
                    address: remote.address,
                    port: remote.port,
                    message: message
                }
                /** @param { UDP_messageInput } outgoing */
                const reply = outgoing => UDP_send(outgoing, this.__config__.socket, remote.address, remote.port)
                this.__config__.callback(incoming, reply)
            },
            errorEventListener: err => this.__config__.error(err)
        }
    }
    /** @param {(message: UDP_ClientData, res: UDP_ClientCallback) => void} callback */
    onData = callback => this.__config__.callback = callback || this.__config__.callback
    onError = error => this.__config__.error = error || this.__config__.error
    start = () => new Promise((resolve, reject) => {
        const { socket } = this.__config__
        if (!this.__config__.listenning) {
            try {
                this.__config__.listenning = true
                socket.on('message', this.__config__.messageEventListener)
                socket.on('error', this.__config__.errorEventListener)
                socket.on('listening', () => resolve(`UDP server listenning on ${this.__config__.host}:${this.__config__.port}`))
                this.__config__.socket.bind(this.__config__.port, this.__config__.host)
            } catch (e) { reject(e) }
        } else reject('Server already running!')
    })
    close = () => {
        if (this.__config__.listenning) {
            this.__config__.listenning = false
            this.__config__.socket.off('message', this.__config__.messageEventListener)
            this.__config__.socket.off('error', this.__config__.errorEventListener)
            this.__config__.socket.close()
        }
        return this
    }
}


/** UDP Send message/buffer @host:port
 * @param { String } host Host address of target
 * @param { Number } port Host port of target
 * @param { UDP_messageInput } input UDP message/buffer to be sent
 * @param { Number } [timeout] optional (default 1000ms)
 * @return { Promise<UDP_sendResponse> } returns Promise
 */
const send = (host, port, input, timeout) => new Promise((resolve, reject) => {
    try {
        const startTime = +new Date();
        const message = Buffer.from(input)
        const UDP_sender = dgram.createSocket('udp4');
        const _timeout = setTimeout(() => closeConnection('timeout'), timeout > 0 && timeout < Infinity ? timeout : 1000)
        const closeConnection = e => { clearTimeout(_timeout); if (e) reject(`UDP send error: ${e.toString()}`); try { UDP_sender.close() } catch (e) { } }
        UDP_send(message, UDP_sender, host, port).then(() => {
            closeConnection()
            resolve({ message, latency: +new Date - startTime })
        }).catch(err => {
            closeConnection(err)
            reject(err)
        })
        UDP_sender.on('error', err => {
            closeConnection(err)
            reject(`UDP request error: ${err.toString()}`)
        })
    } catch (e) { reject(e) }
})

/** UDP Request with message/buffer @host:port
 * @param { String } host Host address of target
 * @param { Number } port Host port of target
 * @param { UDP_messageInput } input UDP message/buffer to be sent
 * @param { Number } [timeout]  optional (default 1000ms)
 * @return { Promise<UDP_requestResponse> } returns Promise
 */
const request = (host, port, input, timeout) => new Promise((resolve, reject) => {
    try {
        const startTime = +new Date();
        const req = Buffer.from(input)
        const UDP_sender = dgram.createSocket('udp4');
        const _timeout = setTimeout(() => closeConnection('timeout'), timeout > 0 && timeout < Infinity ? timeout : 1000)
        const closeConnection = (e) => { clearTimeout(_timeout); if (e) reject(`UDP request error: ${e.toString()}`); try { UDP_sender.close() } catch (e) { } }
        UDP_send(req, UDP_sender, host, port).catch(err => {
            closeConnection(err)
            reject(err)
        })
        UDP_sender.on('message', (message, remote) => {
            closeConnection()
            const reply = outgoing => request(remote.address, remote.port, outgoing, timeout)
            resolve({ message, request: req, reply, latency: +new Date - startTime })
        })
        UDP_sender.on('error', err => {
            closeConnection(err)
            reject(`UDP request error: ${err.toString()}`)
        })
    } catch (e) { reject(e) }
})


/** UDP Send multiple messages/buffers one after another @host:port
 * @param { String } host Host address of target
 * @param { Number } port Host port of target
 * @param { UDP_messageInput | UDP_messageInput[] } inputs UDP message/buffer to be sent
 * @param { Number } [timeout]  optional (default 1000ms)
 * @return { Promise<UDP_sendResponse[]> } returns Promise
 */
const sendMulti = (host, port, inputs, timeout) => new Promise((resolve, reject) => {
    try {
        const messages = isArray(inputs) ? inputs : [inputs]
        /** @type { UDP_sendResponse[] } */
        const responses = []
        const doNextMessage = i => {
            i = i || 0
            if (i < messages.length) {
                const message = messages[i]
                send(host, port, message, timeout).then(response => {
                    responses.push(response)
                    doNextMessage(i + 1)
                }).catch(reject)
            } else resolve(responses)
        }
        doNextMessage()
    } catch (e) { reject(e) }
})

/** UDP Request with multiple messages/buffers one after another @host:port
 * @param { String } host Host address of target
 * @param { Number } port Host port of target
 * @param { UDP_messageInput | UDP_messageInput[] } inputs UDP message/buffer to be sent
 * @param { Number } [timeout]  optional (default 1000ms)
 * @return { Promise<UDP_requestResponse[]> } returns Promise
 */
const requestMulti = (host, port, inputs, timeout) => new Promise((resolve, reject) => {
    try {
        const requests = isArray(inputs) ? inputs : [inputs]
        /** @type { UDP_requestResponse[] } */
        const responses = []
        const doNextRequest = i => {
            i = i || 0
            if (i < requests.length) {
                const req = requests[i]
                request(host, port, req, timeout).then(response => {
                    responses.push(response)
                    doNextRequest(i + 1)
                }).catch(reject)
            } else resolve(responses)
        }
        doNextRequest()
    } catch (e) { reject(e) }
})


/** UDP Send multiple messages/buffers all at the same time @host:port
 * @param { String } host Host address of target
 * @param { Number } port Host port of target
 * @param { UDP_messageInput | UDP_messageInput[] } inputs UDP message/buffer to be sent
 * @param { Number } [timeout]  optional (default 1000ms)
 * @return { Promise<UDP_sendResponse[]> } returns Promise
 */
const sendMultiParallel = (host, port, inputs, timeout) => new Promise((resolve, reject) => {
    try {
        const messages = isArray(inputs) ? inputs : [inputs]
        const promises = messages.map(message => send(host, port, message, timeout))
        Promise.all(promises).then(resolve).catch(reject)
    } catch (e) { reject(e) }
})

/** UDP Request with multiple messages/buffers all at the same time @host:port
 * @param { String } host Host address of target
 * @param { Number } port Host port of target
 * @param { UDP_messageInput | UDP_messageInput[] } inputs UDP message/buffer to be sent
 * @param { Number } [timeout]  optional (default 1000ms)
 * @return { Promise<UDP_requestResponse[]> }  returns Promise
 */
const requestMultiParallel = (host, port, inputs, timeout) => new Promise((resolve, reject) => {
    try {
        const requests = isArray(inputs) ? inputs : [inputs]
        const promises = requests.map(req => request(host, port, req, timeout))
        Promise.all(promises).then(resolve).catch(reject)
    } catch (e) { reject(e) }
})


const VovkUDP = { Server, send, sendMulti, sendMultiParallel, request, requestMulti, requestMultiParallel }

module.exports = exports = VovkUDP