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
let statsResult :string = ''
let isBusy :boolean = false
let timeout :number

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
  askBancho()
  timeout = Math.floor(Math.random() * (config.ircintervalMax - config.ircintervalMin + 1) + config.ircintervalMin)
  queryTimer()
}

function queryTimer() :void {
  setTimeout(() => {
    askBancho()
    timeout = Math.floor(Math.random() * (config.ircintervalMax - config.ircintervalMin + 1) + config.ircintervalMin)
    queryTimer()
  }, timeout * 60000);
}

export function getOSUStats(callback: (reply :string) => void) :void {
  if (statsResult !== '') {
    callback(statsResult)
  } else {
    log.error('getOSUStats: statsResult is empty')
    callback('获取在线列表失败，请尝试执行命令：“更新在线列表”！')
  }
}

export function updateOSUStats(callback: (reply :string) => void) :void {
  if (!isBusy) {
    callback('请求成功，正在更新在线列表...')
    askBancho()
  } else {
    callback('正在执行定时更新，请稍后查询...')
  }
}

function fetchMsg(msg :string) :void {
  if (/^Stats for/g.test(msg)) {
    stats.count = stats.count + 1
    let spliter :Array<string> = msg.split(' ')
    let spliterlen :number = spliter.length
    if (spliter[spliterlen - 2] === 'is') {
      let name_raw :string = spliter.slice(2, -2).join(' ')
      stats.reply = stats.reply + `\n${name_raw.match(/\(([^)]+)\)/)![1]} (${spliter[spliterlen - 1].slice(0, -1)})`
    }
  }
  // if (config.debug) {
  //   log.info(`from BanchoBot: ${msg}`)
  // }
  if (stats.count === osuname.length) {
    if (config.debug) {
      log.info(`getOSUStats: end of querying ${stats.count} players`)
    }
    const now = new Date()
    statsResult = `${now.getHours() > 22 || now.getHours() < 4 ? '卷王列表':'在线列表'}（更新时间 ${now.getHours()}:${now.getMinutes().toLocaleString('en-US',{minimumIntegerDigits: 2})}）：${stats.reply}\n-----`
    stats.count = 0
    stats.reply = ''
    isBusy = false
  }
}

async function askBancho() :Promise<void> {
  if (!isBusy) {
    if (config.debug) {
      log.info('askBancho: start querying')
    }
    isBusy = true
    stats.count = 0
    stats.reply = ''
    for (const user of osuname) {
      await new Promise(f => setTimeout(f, 500))
      client.send('BanchoBot', `STATS ${user.text}`)
    }
  } else {
    log.warn('askBancho: cannot start because isBusy = true')
  }
}
