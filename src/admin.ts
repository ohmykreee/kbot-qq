import config from "../botconfig.js"
import { text2img } from "./utils.js"
import { log } from "./logger.js"
import { handleExit } from "./app.js"
import { pluginsLoad, pluginsUnload } from "./plugin.js"
import db from "./db.js"

/**
 * 处理来自管理员的消息并直接回复
 *
 * @remarks
 * 接受来自管理员消息的字符串，当该消息命中某种规则时，返回回复消息字符串
 *
 * @param msg - 接收消息的字符数组
 * 
 * @returns Promise<string>，返回值为回复的字符串
 */
export function adminHandler(msg :Array<string>) :Promise<string> {
  return new Promise(async (resolve) => {
    let reply :string = ""
    switch (msg[1]) {
      case "help":
      case "h":
      case "帮助":
        reply = 
  `
  狗勾机器人(Kreee bot)管理员命令：
  （仅支持管理员私聊机器人时触发）\n
  /kbot help                                输出该帮助信息\n
  /kbot restart                             以异常状态停止程序并等待 daemon 重启程序\n
  /kbot stop                                无退出码停止程序，如果程序此前有异常则会被 daemon 重启\n
  /kbot reload                              重载所有插件\n
  /kbot log [数字]                          获取最近指定数目的日志\n
  /kbot dbadd/dbrm [数据库名] [字符串]       数据库增减操作\n
  /kbot dblist [数据库名]                    返回该数据库的所有内容
  `
        resolve(text2img(reply))
        break
      
      case "restart":
        resolve(`请求成功，将在3秒后以异常状态关闭程序，并等待 daemon 重启程序...`)
        setTimeout(() => {
          handleExit(2)
        }, 3000)
        break
  
      case "stop":
        resolve(`请求成功，将在3秒后关闭程序...`)
        setTimeout(() => {
          handleExit(process.exitCode)
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
        log.readLog(count)
          .then((logs) => {
            logs.map((log) => {
              reply = reply + `${log}\n`
            })
            resolve(text2img(reply))
          })
          .catch((error) => {
            log.error(`readLog: ${error.toString()}`)
          })
        break

        case "reload":
          await pluginsUnload()
          await pluginsLoad()
          resolve("已重载所有的插件。")
        break

        case "dbadd":
        case "dbrm":
        case "dblist":
          const dbName :"osu" | "food" | "vw50" = msg[2] as "osu" | "food" | "vw50"
          let value :string = msg.slice(3).join(" ")
          // 处理 osu 用户名中的俩特殊字符
          value = value.replace(/&#91;/i, '[')
          value = value.replace(/&#93;/i, ']')
          if (["osu", "food", "vw50"].includes(dbName)) {
            if (msg[1] === "dbadd" && value) {
              await db.push(dbName, value)
              resolve(text2img(`已在数据库 ${dbName} 中添加 ${value}`))
            } else if(msg[1] === "dbrm"  && value){
              await db.rm(dbName, value)
              resolve(text2img(`已在数据库 ${dbName} 中删除 ${value}`))
            } else {
              const data = await db.read(dbName)
              let reply :string = `${dbName}\n------\n`
              data.map((e) => reply = `${reply}${e}\n`)
              resolve(text2img(reply))
            }
          } else {
            resolve("错误：不正确的数据库名（osu、food、vw50）！")
          }
          break

        case "kill":
          // 命令仅在开发模式下可用，测试退出时的清理机制是否正常执行
          if (config.debug) {
            handleExit(process.exitCode)
          }
          break
  
      default:
        resolve('命令错误，请使用命令“/kbot help”来获取所有可用命令！')
    }
  })
}