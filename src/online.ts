import IRC from "slate-irc"
import net from "net"
import { appStatus } from "./app.js"
import { log } from "./logger.js"
import config from "../botconfig.js"
import db from "./db.js"

const queryer :OnlineQuery_types[] = []

interface OnlineQuery_types {
  start() :Promise<void>
  stop() :Promise<void>
  update() :void
  results :string
}

class OnlineQueryClass implements OnlineQuery_types {
  constructor() {
    this.results = ""
    this.start = this.start
    this.stop = this.stop
    this.update = this.update
  }

  results: string

  private _client :IRC.Client[] = []

  private _osuLength :number = 0
  private _counter :number = 0
  private _reply :string = ""
  private _busyCounter :number = 0

  private _timerObj? :NodeJS.Timeout
  private _timeout :number = Math.floor(Math.random() * (config.osuIrcIntervalMax - config.osuIrcIntervalMin + 1) + config.osuIrcIntervalMin)

  start() :Promise<void> {
    return new Promise((resolve) => {
      // 构建 IRC 客户端
      const stream  = net.connect({
        port: 6667,
        host: 'irc.ppy.sh'
      })
      this._client.push(IRC(stream))
      // 传入登录所用信息
      this._client[0].user(config.osuIrcUsername, config.osuIrcUsername)
      this._client[0].pass(config.osuIrcPassword)
      this._client[0].nick(config.osuIrcUsername)
      // 传入事件触发函数，且仅接受来自 BanchoBot 的消息
      this._client[0].on('message',(msg) => {
        if (msg.from === 'BanchoBot') {
          this._receiver(msg.message)
        }
      })
      // 开始第一次查询（30s延时）
      setTimeout(() => { this.update() }, 0.5 * 60000)
      // 若是程序第一次运行，开始运行定时查询
      this._timerObj = this._timer()
      resolve()
    })
  }

  stop() :Promise<void> {
    return new Promise((resolve) => {
      this._client[0].quit("")
      appStatus.isQuery = false
      log.info("getOSUStats: disconnect IRC")
      clearTimeout(this._timerObj)
      queryer.splice(0, queryer.length)
      resolve()
    })
  }

  /**
   * 当接收到来自 BanchoBot 的任意消息时触发
   *
   * @remarks
   * 处理来自 BanchoBot 的消息，同时查询结束后将结果存储至 {@link statsResult} 中
   * ```paintext
   * 以下为事例消息（每一行都为新的一次触发）：
   * Stats for (Kreee)[https://osu.ppy.sh/u/27746946] is Afk:
   * Score: 21,871,636 (#0)
   * Plays: 187 (lv22)
   * Accuracy: 87.35%
   *```
  * @param msg - 来自 BanchoBot 消息的字符串
  * 
  * @private
  * 
  */
  private _receiver(msg: string): void {
    // 如果开头命中 Stats for 规则，则说明为所需的包含在线信息的内容，否则则丢弃
    if (msg.indexOf("Stats for") === 0) {
      this._counter = this._counter + 1  // 给查询计数加一，用于判断是否查询完成
      let spliter :string[] = msg.split(' ')  // 字符由空格分开为字符组
      let spliterlen :number = spliter.length      // 获取字符组的长度，简化代码
      if (spliter[spliterlen - 2] === 'is') {      // 以字符组中是否包含 is 为判据判断是否在线
        let name_raw :string = spliter.slice(2, -2).join(' ')  // 去头去尾并拼接字符，防止因 id 中含有空格而造成错误
        // 拼接当前查询结果并存储在临时查询结果存储中
        this._reply = this._reply + `\n${name_raw.slice(1, name_raw.indexOf("https://osu") - 2)} (${spliter[spliterlen - 1].slice(0, -1)})`
      }
    }

    // 如果有玩家更改了用户名导致无法查询
    if (msg === "User not found") {
      this._counter = this._counter + 1
      log.error("getOSUStats: invalid username detected!")
    }

    // 如果在开发模式下，输出所有来自 BanchoBot 的消息至日志，因为输出内容过于多所以注释禁用
    // console.log(`from BanchoBot: ${msg}`)

    // 判断是否完成查询
    if (this._osuLength !== 0 && this._counter > (this._osuLength - 1)) {
      // 输出查询结束日志
      log.debug(`getOSUStats: end of querying ${this._counter} players`)
      const now = new Date() // 用于输出查询时时间，和判断是否需要使用“卷王”称号
      // 将最终查询结果转存入查询结果变量中
      this.results = `${now.getHours() > 22 || now.getHours() < 4 ? '卷王列表':'在线列表'}（更新时间 ${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours().toLocaleString('en-US',{minimumIntegerDigits: 2})}:${now.getMinutes().toLocaleString('en-US',{minimumIntegerDigits: 2})}）：${this._reply}\n-----`
      // 清空临时查询变量内内容
      this._counter = 0
      this._reply = ""
      // 解锁,清空撞锁计数
      appStatus.isQuery = false
      this._busyCounter = 0
    }
  }

  /**
   * 对 BanchoBot 进行查询
   *
   * @remarks
   * 受 {@link appStatus.isQuery} 锁影响，可能被 {@link start()}、{@link _timer()}、{@link updateOSUStats()} 调用
   *
   */
  async update(): Promise<void> {
    const osuname = await db.read("osu")
    this._osuLength = osuname.length
    // 判断是否有锁
    if (!appStatus.isQuery && !appStatus.isMP) {
      // 输出开始查询的日志
      log.debug('askBancho: start querying')
      // 上锁
      appStatus.isQuery = true
      // 清空临时查询变量内内容
      this._counter = 0
      this._reply = ''
      // 遍历查询
      for (const user of osuname) {
        await new Promise(f => setTimeout(f, 1 * 1000))
        this._client[0].send('BanchoBot', `STATS ${user}`)
      }
    } else if (appStatus.isQuery) {
      // 如果撞锁多次，则强制停止程序
      if (this._busyCounter > 1) {
        log.fatal('askBancho: cannot start because isQuery = true, exit.')
      } else {
        this._busyCounter = this._busyCounter + 1
        log.warn(`askBancho: cannot start because isQuery = true, counter ${this._busyCounter}`)
      }
    }
  }

  /**
   * 定时查询
   *
   * @remarks
   * 在一定 {@link _timeout} 分钟后执行一次 {@link _update()}
   * 
   * @private
   * 
   */
  private _timer() :NodeJS.Timeout{
    return setTimeout(() => {
      this.update()
      this._timeout = Math.floor(Math.random() * (config.osuIrcIntervalMax - config.osuIrcIntervalMin + 1) + config.osuIrcIntervalMin)
      this._timer() // 重复调用自身，形成循环
    }, this._timeout * 60000)
  }
}

/**
 * 初始化 slate-irc
 *
 * @remarks
 * 传入登录所用信息和事件触发函数，程序开始时在 app.ts 处被调用 
 * 
 */
export function startIRC() :Promise<void> {
  queryer.push(new OnlineQueryClass())
  return queryer[0].start()
}

/**
 * 停止 slate-irc
 *
 * @remarks
 * 登出 osu-irc，并暂停
 * 
 */
export function stopIRC () :Promise<void>{
  return queryer[0].stop()
}


/**
 * 处理来自 handler.ts 的查询请求
 *
 * @remarks
 * 当有来自 handler.ts 的查询请求时，从 {@link statsResult} 中获取结果字符串并通过回调函数返回
 *
 * @returns Promise<string>，返回值为字符串
 * 
 */
export function getOSUStats() :Promise<string> {
  return new Promise((resolve, reject) => {
  // 判断 statsResult 是否为空，一般为程序首次运行时过早提交查询请求
  if (queryer[0].results !== '') {
    resolve(`${queryer[0].results}${appStatus.isMP? "\n（注意：因正在主持多人游戏，查询已暂停）":""}`)
  } else {
    log.error('getOSUStats: statsResult is empty')
    reject('获取在线列表失败，请尝试执行命令：“/在线 更新”！')
  }
  })
}

/**
 * 处理来自 handler.ts 的更新请求
 *
 * @remarks
 * 当有来自 handler.ts 的更新请求时，调用 {@link askBancho()} 并通过回调函数返回触发结果
 *
 * @returns Promise<string>，返回值为字符串（成功或失败）
 * 
 */
export function updateOSUStats() :Promise<string> {
  return new Promise((resolve, reject) => {
  // 判断 BanchoBot 的查询是否正在进行（锁是否被锁上）
  if (!appStatus.isQuery && !appStatus.isMP) {
    resolve('请求成功，正在更新在线列表...')
    queryer[0].update()
  } else {
    reject(`${appStatus.isMP? "查询已暂停":"查询正忙"}，请稍后查询...`)
  }
  })
}

