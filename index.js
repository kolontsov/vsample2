const MidiDevice = require('./midi.js')

let identityRequest = [
    0xf0, // sysex start
    0x7e, // non-realtime
    0x7f, // any sysex channel
    0x06, // sub-id: General Information
    0x01, // sub-id2: Identity Request
    0xf7, // sysex end
]

let identityReply = [
    0xf0, // sysex start
    0x7e, // non-realtime
    0x00, // channel 0
    0x06, // sub-id: General Information
    0x02, // sub-id2: Identity Reply
    0x42, // manufacturer's ID -- KORG
    0x2d, // family code (lsb) -- VOLCA SAMPLE 2
    0x01, // family code (msb) -- VOLCA SAMPLE 2
    0x08, // family number code (lsb)
    0x00, // family number code (msb) 
    0x00, // software revision
    0x00, // software revision
    0x01, // software revision
    0x00, // software revision
    0xf7, // sysex end
]

let getSampleHeader = n => [
    0xf0, // sysex start
    0x42, // vendor-specific: KORG
    0x30, // get data, channel 0
    0x00, // ..
    0x01, // ..
    0x2d, // VOLCA SAMPLE 2
    0x1e, // ...
    n % 128,// sample number
    Math.floor(n / 128), // sample number
    0xf7, // sysex end
]

let getSampleHeaderReply = n => [
    0xf0, // sysex start
    0x42, // vendor-specifc: KORG
    0x30, // get data, channel 0
    0x00, // ..
    0x01, // ..
    0x2d, // VOLCA SAMPLE 2
    0x4e, // ..
    n % 128,// sample number
    Math.floor(n / 128), // sample number
]

class VolcaSample2 extends MidiDevice {
    constructor(opt) {
        super(opt)
        this.in.openPort(this.find_port(this.in, 'volca sample IN'))
        this.in.ignoreTypes(false, true, true) // sysex, timing, active sensing
        this.out.openPort(this.find_port(this.out, 'volca sample OUT'))
    }
    async detect() {
        console.log('- detecting Volca Sample 2')
        let expected = identityReply.slice(0, 8)
        let reply = await this.send(identityRequest, expected)
        if (!reply)
            throw new Error('No answer in time')
        console.log('- found')
    }
    async getSampleName(n) {
        let reply = await this.send(getSampleHeader(n), getSampleHeaderReply(n))
	if (!reply)
            throw new Error('No answer in time')
        let len = [7, 7, 7, 3]
        let name = '';
        for (let i = 0, ofs = 10; i < len.length; ofs += 8, i++)
            name += reply.slice(ofs, ofs + len[i]).toString().replace(/\0/g, '')
        return name
    }
}

async function main() {
    try {
        volca = new VolcaSample2({ timeout_ms: 5000 })
        await volca.detect()
        for (let i = 0; i < 200; i++)
            console.log(i, (await volca.getSampleName(i)) || '-- n/a --')
        process.exit(0)
    } catch (e) { console.log('ERROR:', e.message) }
}

main()
