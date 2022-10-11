import { exit } from "process"
import { text2img } from "./utils"
import { readLog } from "./logger"

/**
 * 处理来自管理员的消息并直接回复
 *
 * @remarks
 * 接受来自管理员消息的字符串，当该消息命中某种规则时，返回回复消息字符串
 *
 * @param msg - 接收消息的字符数组
 * @param callback - 回调函数，返回值为字符串
 * 
 */
export function adminHandler(msg :Array<string>, callback: (reply :string) => void ) :void {
  switch (msg[1]) {
    case "help":
    case "h":
    case "帮助":
      const reply :string = 
`
狗勾机器人(Kreee bot)管理员命令：
（仅支持管理员私聊机器人时触发）\n
/kbot help        输出该帮助信息\n
/kbot restart     以异常状态停止程序并等待 daemon 重启程序\n
/kbot stop        无退出码停止程序，如果程序此前有异常则会被 daemon 重启\n
/kbot log [数字]   获取最近指定数目的日志
`
      callback(text2img(reply))
      break
    
    case "restart":
      callback(`请求成功，将在3秒后以异常状态关闭程序，并等待 daemon 重启程序...`)
      setTimeout(() => {
        exit(2)
      }, 3000)
      break

    case "stop":
      callback(`请求成功，将在3秒后关闭程序...`)
      setTimeout(() => {
        exit()
      }, 3000)
      break

    case "log":
      //如果请求中不包含数字则在末尾添加 5 来给予一个默认值
      let count :number
      if (!msg[2] && !(/\d+/.test(msg[2]))) {
        count = 5
      } else {
        count = parseInt(msg[2])
      }
      readLog(count, function(logs) {
        let reply :string = ""
        logs.map((log) => {
          reply = reply + `${log}\n`
        })
        callback(text2img(reply))
      })
      break

    default: 
      callback('命令错误，请使用命令“/kbot help”来获取所有可用命令！')
  }
}