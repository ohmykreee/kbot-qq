import child_process from 'child_process'
import { appStatus } from "./app.js"
import { text2img } from "./utils.js"
import { log } from "./logger.js"
import { stopIRC, startIRC } from "./online.js"
import config from "../botconfig.js"

const osuahr :osuahr_types[] = []

interface osuahr_types {
  roomName :string
  isWaitClose :boolean
  start() :Promise<void>
  send(data :string) :void
}

class osuahrClass implements osuahr_types {
  constructor(roomName :string) {
    this.roomName = roomName
    this.start = this.start
    this.send = this.send
    this.isWaitClose = false
  }

  roomName: string
  isWaitClose :boolean

  private _terminal :child_process.ChildProcessWithoutNullStreams[] = []

  /**
   * 初始化并启动 osu-ahr
   * 
   * @returns Promise<void>，初始化 osu-ahr 后延时 3s 返回
   * 
   */
  start() :Promise<void> {
    return new Promise((resolve, reject) => {   
      this._terminal.push(child_process.spawn(process.execPath, ['./dist/cli/index.js'], { cwd: config.ahrCWD }))
      // 因为不可控因素过多，不存运行时产生的正常日志于 logger 中
      // 处理来自 osuahr 的输出内容
      this._terminal[0].stdout.on('data', (buffer :any) => {
        console.log(`osu-ahr: ${buffer.toString()}`)
      })
      // 处理来自 osuahr 的错误信息
      this._terminal[0].stderr.on('data', (buffer :any) => {
        log.error(`osu-ahr: ${buffer.toString()}`)
      })
      // 处理来自 osuahr 的关闭事件
      this._terminal[0].on('close', () => {
        this._stop()
      })
      setTimeout(() => {
        resolve()
      }, 3000)
    })
  }

  /**
   * 停止 osu-ahr
   * 
   * @private
   * 
   */
  private _stop() :void {
    log.info(`osu-ahr: closed`)
    appStatus.isMP = false
    this.roomName = ""
    this.isWaitClose = false
    setTimeout(async () => {
      await startIRC()
    }, 3000)
    osuahr.splice(0, osuahr.length)
  }

  /**
   * 发送命令给 osu-ahr
   * 
   */
  send(data :string) :void {
    this._terminal[0].stdin.write(data + '\n')
  }

}

/**
 * 处理来自开房请求的消息并直接回复
 *
 * @remarks
 * 接受来自开房请求的消息的字符串，当该消息命中某种规则时，返回回复消息字符串
 *
 * @param msg - 接收消息的字符数组
 * 
 * @returns Promise<string>，返回值为回复的字符串
 * 
 */
 export function mpHandler(msg :Array<string>) :Promise<string> {
  return new Promise(async (resolve) => {
    switch(msg[1]) {
      case "help":
      case "h":
      case "帮助":
        const reply :string =
  `
  狗勾机器人(Kreee bot)自动多人游戏房间主持命令：
  （默认为房主自动轮换，命令仅支持群聊中触发）\n
  /mp help             输出该帮助信息\n
  /mp status           输出当前机器人多人游戏状态\n
  /mp make [房间名]    开一个指定名字的房间（可能不支持中文）并主持\n
  /mp close            （在所有人离开房间后）关闭当前房间\n
  /mp run [命令]       以管理员权限运行指定命令
      命令详情可以参考：https://github.com/Meowhal/osu-ahr
      下面列出常用命令：
          房主设置：
          *start  强制开始
          *skip   强制跳过当前房主
          房间设置：
          *keep size [1-16]      设置房间大小
          *keep password [密码]  设置房间密码
          谱面设置：
          *regulation min_star [数字]  谱面最小星数
          *regulation max_star [数字]  谱面最大星数
          *regulation min_length [秒]  谱面最短时间 
          *regulation max_length [秒]  谱面最长时间
          *regulation gamemode [osu|taiko|fruits|mania] 谱面模式
          *regulation allow_convert    允许转谱出现
          *regulation disallow_convert 不允许转谱出现
  `
        resolve(text2img(reply))
        break
  
      case "status":
        const status :string =`是否正在主持多人游戏：${appStatus.isMP? "是":"否"}\n${appStatus.isMP? `房间名：${osuahr[0].roomName}`:""}`
        resolve(text2img(status))
        break
  
      case "make":
        if (!appStatus.isMP) {
          let room :string = msg.slice(2).join(" ")
          if (!room) {
            resolve('请输入有效的房间名称！')
            return
          }
          appStatus.isMP = true
          await stopIRC()
          osuahr.push(new osuahrClass(room))
          resolve(text2img(`注意：主持多人游戏期间查询在线功能将暂停！\n5s 后开始创建房间并主持：${osuahr[0].roomName}`))
          setTimeout(() => {
            osuahr[0].start()
              .then(() => {
                osuahr[0].send(`make ${room}`)
              })
            log.info(`osu-ahr: make room: ${osuahr[0].roomName}`)
          }, 2000)
        } else {
          resolve(text2img(`创建失败：\n正在主持多人游戏，房间名：${osuahr[0].roomName}`))
        }
        break
  
      case "close":
        if (appStatus.isMP) {
          if (!osuahr[0].isWaitClose) {
            osuahr[0].send(`close`)
            resolve("请求关闭房间成功，等待所有人退出房间...")
            log.info(`osu-ahr: close room ${osuahr[0].roomName}`)
            osuahr[0].isWaitClose = true
          } else {
            resolve("已经请求过关闭房间，正在等待所有人退出房间...")
          }
        } else {
          resolve("未开始主持多人游戏，请使用“/mp make [房间名]”来创建房间！")
        }
        break
  
      case "run":
        if (appStatus.isMP) {
          let command :string = msg.slice(2).join(" ")
          if (!command) {
            resolve('请输入有效的命令！')
            return
          }
          osuahr[0].send(command)
          resolve(text2img(`尝试执行命令：${command}`))
        } else {
          resolve("未开始主持多人游戏，请使用“/mp make [房间名]”来创建房间！")
        }
        break
  
      // 两个测试用命令，只在开发环境中可用，用于测试是否调用子进程成功/关闭子进程后的程序行为调试
      case "start":
      case "stop":
        if (config.debug) {
          if (msg[1] === "start") {
            appStatus.isMP = true
            await stopIRC()
            log.debug("osu-ahr: stop online-query IRC")
            osuahr.push(new osuahrClass("*以 Debug 方式启动*"))
            setTimeout(() => {
              osuahr[0].start()
                .then(() => {
                  osuahr[0].send("help")
                  log.debug("osu-ahr: start osu-ahr")
                })
            }, 2000)
          } else {
            osuahr[0].send(`quit`)
          }
          return
        }
  
      default:
        resolve("未知命令，请使用命令“/mp help”来获取所有可用命令！")
    }
  })
 }