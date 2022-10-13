import IRC from "slate-irc"
import net from "net"
import { appStatus } from "./app"
import { log } from "./logger"
import { config } from "../botconfig"
import { osuname } from "./list/osu"

// 用于临时存储查询结果，判断是否查询完成，查询前后要清空一次
interface stats {
  count :number
  reply :string
}
const stats :stats = {
  count: 0,
  reply: '',
}
// 用于存储查询结果，当 handler.ts 请求查询时返回该值
let statsResult :string = ''
// 撞锁计数，如果多次撞锁则强制终止程序，等待 daemon 重启程序
let isBusyCounter :number = 0
// 用于定时查询间隔（分钟），为一一定范围内的随机整数值
let timeout :number

// 创建一个容器用于装载 IRC 客户端实例
let client :IRC.Client

/**
 * 初始化 slate-irc
 *
 * @remarks
 * 传入登录所用信息和事件触发函数，程序开始时在 app.ts 处被调用 
 * 
 */
export function startIRC() :void {
  // 构建 IRC 客户端
  const stream  = net.connect({
    port: 6667,
    host: 'irc.ppy.sh'
  })
  client = IRC(stream)
  // 传入登录所用信息
  client.user(config.ircusername, config.ircusername)
  client.pass(config.ircpassword)
  client.nick(config.ircusername)
  // 传入事件触发函数，且仅接受来自 BanchoBot 的消息
  client.on('message', function(msg) {
    if (msg.from === 'BanchoBot') {
      fetchMsg(msg.message)
    }
  })
  // 开始第一次查询
  askBancho()
  // 开始程序运行时第一次 timeout 随机值选取
  timeout = Math.floor(Math.random() * (config.ircintervalMax - config.ircintervalMin + 1) + config.ircintervalMin)
  // 若是程序第一次运行，开始运行定时查询
    queryTimer()
}

/**
 * 停止 slate-irc
 *
 * @remarks
 * 登出 osu-irc，并暂停
 * 
 */
export function stopIRC () :void{
  client.quit("")
  appStatus.isQuery = false
  log.info("getOSUStats: disconnect IRC")
}


/**
 * 定时查询
 *
 * @remarks
 * 在一定 {@link timeout} 分钟后执行一次 {@link askBancho()}
 * 
 */
function queryTimer() :void {
  setTimeout(() => {
    askBancho()
    timeout = Math.floor(Math.random() * (config.ircintervalMax - config.ircintervalMin + 1) + config.ircintervalMin)
    queryTimer() // 重复调用自身，形成循环
  }, timeout * 60000);
}

/**
 * 处理来自 handler.ts 的查询请求
 *
 * @remarks
 * 当有来自 handler.ts 的查询请求时，从 {@link statsResult} 中获取结果字符串并通过回调函数返回
 *
 * @param callback - 回调函数，返回值为字符串
 * 
 */
export function getOSUStats(callback: (reply :string) => void) :void {
  // 判断 statsResult 是否为空，一般为程序首次运行时过早提交查询请求
  if (statsResult !== '') {
    callback(statsResult)
  } else {
    log.error('getOSUStats: statsResult is empty')
    callback('获取在线列表失败，请尝试执行命令：“/在线 更新”！')
  }
}

/**
 * 处理来自 handler.ts 的更新请求
 *
 * @remarks
 * 当有来自 handler.ts 的更新请求时，调用 {@link askBancho()} 并通过回调函数返回触发结果
 *
 * @param callback - 回调函数，返回值为字符串（成功或失败）
 * 
 */
export function updateOSUStats(callback: (reply :string) => void) :void {
  // 判断 BanchoBot 的查询是否正在进行（锁是否被锁上）
  if (!appStatus.isQuery && !appStatus.isMP) {
    callback('请求成功，正在更新在线列表...')
    askBancho()
  } else {
    callback('查询正忙或查询已暂停，请稍后查询...')
  }
}

/**
 * 当接收到来自 BanchoBot 的任意消息时触发
 *
 * @remarks
 * 处理来自 BanchoBot 的消息，同时查询结束后将结果存储至 {@link statsResult} 中
 * ```paintext
 * 以下为事例消息（每一行都为新的一次触发）：
 * Stats for (Kreee)[osu.ppy.sh/u/27746946] is Afk:
 * Score: 21,871,636 (#0)
 * Plays: 187 (lv22)
 * Accuracy: 87.35%
 *```
 * @param msg - 来自 BanchoBot 消息的字符串
 * 
 */
function fetchMsg(msg :string) :void {
  // 如果开头命中 Stats for 规则，则说明为所需的包含在线信息的内容，否则则丢弃
  if (/^Stats for/g.test(msg)) {
    stats.count = stats.count + 1  // 给查询计数加一，用于判断是否查询完成
    let spliter :Array<string> = msg.split(' ')  // 字符由空格分开为字符组
    let spliterlen :number = spliter.length      // 获取字符组的长度，简化代码
    if (spliter[spliterlen - 2] === 'is') {      // 以字符组中是否包含 is 为判据判断是否在线
      let name_raw :string = spliter.slice(2, -2).join(' ')  // 去头去尾并拼接字符，防止因 id 中含有空格而造成错误
      // 拼接当前查询结果并存储在临时查询结果存储中
      stats.reply = stats.reply + `\n${name_raw.match(/\(([^)]+)\)/)![1]} (${spliter[spliterlen - 1].slice(0, -1)})`
    }
  }

  // 如果在开发模式下，输出所有来自 BanchoBot 的消息至日志，因为输出内容过于多所以注释禁用
  // log.debug(`from BanchoBot: ${msg}`)

  // 判断是否完成查询（查询计数 > 被查询总数-1）
  if (stats.count > (osuname.length - 1)) {
    // 输出查询结束日志
    log.debug(`getOSUStats: end of querying ${stats.count} players`)
    const now = new Date() // 用于输出查询时时间，和判断是否需要使用“卷王”称号
    // 将最终查询结果转存入查询结果变量中
    statsResult = `${now.getHours() > 22 || now.getHours() < 4 ? '卷王列表':'在线列表'}（更新时间 ${now.getHours().toLocaleString('en-US',{minimumIntegerDigits: 2})}:${now.getMinutes().toLocaleString('en-US',{minimumIntegerDigits: 2})}）：${stats.reply}\n-----`
    // 清空临时查询变量内内容
    stats.count = 0
    stats.reply = ''
    // 解锁,清空撞锁计数
    appStatus.isQuery = false
    isBusyCounter = 0
  }
}

/**
 * 对 BanchoBot 进行查询
 *
 * @remarks
 * 受 {@link isBusy} 锁影响，可能被 {@link startIRC()}、{@link queryTimer()}、{@link updateOSUStats()} 调用
 *
 */
async function askBancho() :Promise<void> {
  // 判断是否有锁
  if (!appStatus.isQuery && !appStatus.isMP) {
    // 输出开始查询的日志
    log.debug('askBancho: start querying')
    // 上锁
    appStatus.isQuery = true
    // 清空临时查询变量内内容
    stats.count = 0
    stats.reply = ''
    // 遍历查询
    for (const user of osuname) {
      await new Promise(f => setTimeout(f, 500)) // 每次间隔 500ms
      client.send('BanchoBot', `STATS ${user}`)
    }
  } else if (appStatus.isQuery) {
    // 如果撞锁多次，则强制停止程序
    if (isBusyCounter > 2) {
      log.fatal('askBancho: cannot start because isQuery = true, exit.')
    } else {
      isBusyCounter = isBusyCounter + 1
      log.warn(`askBancho: cannot start because isQuery = true, counter ${isBusyCounter}`)
    }
  }
}
