import child_process from 'child_process'
import { appStatus } from "./app"
import { text2img } from "./utils"
import { log } from "./logger"
import { stopIRC, startIRC } from "./online"
// import { exit } from 'process'
import { config } from "../botconfig"

// 存储房间名称
let roomName :string
// 是否在等待关闭
let waitClose :boolean = false

// 创建接口（灵感来源自：https://stackoverflow.com/questions/54185655/how-do-you-create-a-terminal-instance-within-a-nodejs-child-process）
interface osuahr {
  terminal: child_process.ChildProcessWithoutNullStreams
  send: (data :string) => void
}
let osuahr :osuahr

/**
 * 初始化并启动 osu-ahr
 * 
 * @param callback - 回调函数，初始化 osu-ahr 后延时 3s 调用
 * 
 */
function startOsuAhr( callback:() => void ) :void {
  osuahr = {
    terminal: child_process.spawn(process.execPath, ['./dist/cli/index.js'], { cwd: config.ahrcwd }),
    send: (data: string) => {
      osuahr.terminal.stdin.write(data + '\n')
    }
  }

  // 因为不可控因素过多，不存运行时产生的正常日志于 logger 中
  // 处理来自 osuahr 的输出内容
  osuahr.terminal.stdout.on('data', (buffer :any) => {
    console.log(`osu-ahr: ${buffer.toString()}`)
  })
  // 处理来自 osuahr 的错误信息
  osuahr.terminal.stderr.on('data', (buffer :any) => {
    log.error(`osu-ahr: ${buffer.toString()}`)
  })
  // 处理来自 osuahr 的关闭事件
  osuahr.terminal.on('close', () => {
    log.info(`osu-ahr: closed`)
    appStatus.isMP = false
    roomName = ""
    waitClose = false
    // 因为一些奇奇怪怪的原因，一道让程序异常退出然后等待 daemon 重启吧（恼
    // exit(2)
    // 好像又行了，多试一会
    setTimeout(() => {
      startIRC()
    }, 3000)
  })
  // 调用回调函数，进行接下来的操作
  setTimeout(() => {
    callback()
  }, 3000)
}

/**
 * 处理来自开房请求的消息并直接回复
 *
 * @remarks
 * 接受来自开房请求的消息的字符串，当该消息命中某种规则时，返回回复消息字符串
 *
 * @param msg - 接收消息的字符数组
 * @param callback - 回调函数，返回值为字符串
 * 
 */
 export function mpHandler(msg :Array<string>, callback: (reply :string) => void) :void {
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
      callback(text2img(reply))
      break

    case "status":
      const status :string =`是否正在主持多人游戏：${appStatus.isMP? "是":"否"}\n${appStatus.isMP? `房间名：${roomName}`:""}`
      callback(text2img(status))
      break

    case "make":
      if (!appStatus.isMP) {
        let room :string = msg.slice(2).join(" ")
        if (!room) {
          callback('请输入有效的房间名称！')
          return
        }
        appStatus.isMP = true
        stopIRC()
        roomName = room
        callback(text2img(`注意：主持多人游戏期间查询在线功能将暂停！\n5s 后开始创建房间并主持：${roomName}`))
        setTimeout(() => {
          startOsuAhr(() => {
            osuahr.send(`make ${room}`)
          })
          log.info(`osu-ahr: make room: ${roomName}`)
        }, 2000)
      } else {
        callback(text2img(`创建失败：\n正在主持多人游戏，房间名：${roomName}`))
      }
      break

    case "close":
      if (appStatus.isMP) {
        if (!waitClose) {
          osuahr.send(`close`)
          callback("请求关闭房间成功，等待所有人退出房间...")
          log.info(`osu-ahr: close room ${roomName}`)
          waitClose = true
        } else {
          callback("已经请求过关闭房间，正在等待所有人退出房间...")
        }
      } else {
        callback("未开始主持多人游戏，请使用“/mp make [房间名]”来创建房间！")
      }
      break

    case "run":
      if (appStatus.isMP) {
        let command :string = msg.slice(2).join(" ")
        if (!command) {
          callback('请输入有效的命令！')
          return
        }
        osuahr.send(command)
        callback(text2img(`尝试执行命令：${command}`))
      } else {
        callback("未开始主持多人游戏，请使用“/mp make [房间名]”来创建房间！")
      }
      break

    // 两个测试用命令，只在开发环境中可用，用于测试是否调用子进程成功/关闭子进程后的程序行为调试
    case "start":
    case "stop":
      if (config.debug) {
        if (msg[1] === "start") {
          appStatus.isMP = true
          stopIRC()
          log.debug("osu-ahr: stop online-query IRC")
          roomName = "*以 无命令 方式启动*"
          setTimeout(() => {
            startOsuAhr(() => {
              osuahr.send(`help`)
              log.debug("osu-ahr: start osu-ahr")
            })
          }, 2000)
        } else {
          osuahr.send(`quit`)
        }
        return
      }

    default:
      callback("未知命令，请使用命令“/mp help”来获取所有可用命令！")
  }
 }