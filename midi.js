const midi = require('midi')
const sleep = require('util').promisify(setTimeout)

class MidiDevice {
    constructor({ timeout_ms } = {}) {
        this.in = new midi.Input()
        this.out = new midi.Output()
        this.timeout_ms = timeout_ms || 5000
    }
    find_port(dev, name) {
        let portCount = dev.getPortCount()
        for (let i = 0; i < portCount; i++) {
            let portName = dev.getPortName(i)
            if (portName == name)
                return i
        }
        throw new Error(`MIDI port '${name}' not found`)
    }
    async send(request, expected) {
        let q = new Promise((resolve, reject) => {
            let cb = (deltaTime, msg) => {
                if (expected.every((val, i) => val == msg[i])) {
                    this.in.off('message', cb)
                    resolve(Buffer.from(msg))
                }
            }
            this.in.on('message', cb)
            this.out.sendMessage(request)
        })
        return await Promise.race([q, sleep(this.timeout_ms)])
    }
    sysexEncode(arr) {
        let res = [], msb_idx, msb, cnt
        for (let i = 0; i < arr.length; i++) {
            if (!(cnt = i % 7)) {
                msb_idx = res.length
                res.push(0)
            }
            msb = (arr[i] >> 7) & 1
            res[msb_idx] |= msb << (6 - cnt)
            res.push(arr[i] & 0x7F)
        }
        return res
    }
    sysexDecode(arr) {
        let res = [], msb_idx, msb, cnt
        for (let i = 0; i < arr.length; i++) {
            if (!(cnt = i % 8)) {
                msb_idx = i;
                continue;
            }
            msb = (arr[msb_idx] >> (7 - cnt)) & 1
            res.push(arr[i] | msb << 7)
        }
        return res
    }
}

module.exports = MidiDevice
