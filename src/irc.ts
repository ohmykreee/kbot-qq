import IRC from "slate-irc"
import net from "net"
import { config } from "../botconfig"
import { osuname } from "./list/osu"

const SimpleNodeLogger = require('simple-node-logger'),
	opts = {
		// logFilePath:'mylogfile.log',
		timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS'
	},
log = SimpleNodeLogger.createSimpleLogger( opts )

interface stats {
  count :number
  reply :string
}
const stats :stats = {
  count: 0,
  reply: '',
}
let callbackFunc :any

const stream  = net.connect({
  port: 6667,
  host: 'irc.ppy.sh'
})
const client = IRC(stream)

export function startIRC() :void {
  client.user(config.ircusername, config.ircusername)
  client.pass(config.ircpassword)
  client.nick(config.ircusername)
  client.on('message', function(msg) {
    if (msg.from === 'BanchoBot') {
      fetchMsg(msg.message)
    }
  })
}

export function getOSUStats(callback: (reply :string) => void) :void {
  stats.count = 0
  stats.reply = ''
  askBancho()
  callbackFunc = callback
}

function fetchMsg(msg :string) :void {
  if (/^Stats for/g.test(msg)) {
    stats.count = stats.count + 1
    let spliter :Array<string> = msg.split(' ')
    let spliterlen :number = spliter.length
    if (spliter[spliterlen - 2] === 'is') {
      let name_raw :string = spliter.slice(2. -2).join(' ')
      stats.reply = stats.reply + `\n${name_raw.match(/\(([^)]+)\)/)![1]} (${spliter[spliterlen - 1].slice(0, -1)})`
    }
  }
  if (config.debug) {
    log.info(`from BanchoBot: ${msg}`)
  }
  if (stats.count === osuname.length) {
    log.info(`getOSUStats: end of querying ${stats.count} players`)
    callbackFunc(`${stats.reply}\n-----`)
    stats.count = 0
    stats.reply = ''
  }
}

async function askBancho() :Promise<void> {
  log.info('askBancho: start querying')
  for (const user of osuname) {
    await new Promise(f => setTimeout(f, 500))
    client.send('BanchoBot', `STATS ${user.text}`)
  }
}
