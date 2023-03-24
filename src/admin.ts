import config from "../botconfig.js"
import { renderAdmin } from "./render/_middleware.js"
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
 * @returns Promise<string | string[]>，返回值为回复的字符串
 * 如果返回是一个字符串数组，会取第一个作为回复，第二个为发送失败（通常为风控）时备用发送字符
 */
export function adminHandler(msg :Array<string>) :Promise<string | string[]> {
  return new Promise(async (resolve) => {
    let reply :string = ""
    switch (msg[1]) {
      case "help":
      case "h":
      case "帮助":
        reply = `
              狗勾机器人(Kreee bot)管理员命令：<br>
              （仅支持管理员私聊机器人时触发）<br>
              <table>
              <tr> <td> /kbot help </td> <td> 输出该帮助信息 </td> </tr>
              <tr> <td> /kbot restart </td> <td> 以异常状态停止程序并等待 daemon 重启程序 </td> </tr>
              <tr> <td> /kbot stop </td> <td> 无退出码停止程序，如果程序此前有异常则会被 daemon 重启 </td> </tr>
              <tr> <td> /kbot reload </td> <td> 重载所有插件 </td> </tr>
              <tr> <td> /kbot log [数字] </td> <td> 获取最近指定数目的日志 </td> </tr>
              <tr> <td> /kbot dbadd/dbrm [数据库名] [字符串] </td> <td> 数据库增减操作 </td> </tr>
              <tr> <td> /kbot dblist [数据库名] </td> <td> 返回该数据库的所有内容 </td> </tr>
              <tr> <td> /kbot echo [字符串] </td> <td> 直接返回字符串，测试 CQ 码等特殊格式 </td> </tr>
            </table>`
          renderAdmin(reply)
            .then((url) => {
              resolve([`[CQ:image,file=${url}]`,`图片消息发送失败了＞﹏＜，请前往 ${url} 查看！（链接有效期 1 天）`])
            })
            .catch((error) => {
              log.error(`renderAdmin: ${error.toString()}`)
              resolve("发生致命错误，已上报给管理员。")
            })
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
        let count :number = parseInt(msg[2])
        if (isNaN(count)) count = 5
        log.readLog(count)
          .then((logs) => {
            logs.map((log) => {
              reply = reply + `${log}<br>`
            })
            renderAdmin(reply)
              .then((url) => {
                resolve([`[CQ:image,file=${url}]`,`图片消息发送失败了＞﹏＜，请前往 ${url} 查看！（链接有效期 1 天）`])
              })
              .catch((error) => {
                log.error(`renderAdmin: ${error.toString()}`)
                resolve("发生致命错误，已上报给管理员。")
              })
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
          if (["osu", "food", "vw50"].includes(dbName)) {
            if (msg[1] === "dbadd" && value) {
              await db.push(dbName, value)
              renderAdmin(`已在数据库 ${dbName} 中添加 ${value}`)
                .then((url) => {
                  resolve([`[CQ:image,file=${url}]`,`图片消息发送失败了＞﹏＜，请前往 ${url} 查看！（链接有效期 1 天）`])
                })
                .catch((error) => {
                  log.error(`renderAdmin: ${error.toString()}`)
                  resolve("发生致命错误，已上报给管理员。")
                })
            } else if(msg[1] === "dbrm"  && value){
              await db.rm(dbName, value)
              renderAdmin(`已在数据库 ${dbName} 中删除 ${value}`)
                .then((url) => {
                  resolve([`[CQ:image,file=${url}]`,`图片消息发送失败了＞﹏＜，请前往 ${url} 查看！（链接有效期 1 天）`])
                })
                .catch((error) => {
                  log.error(`renderAdmin: ${error.toString()}`)
                  resolve("发生致命错误，已上报给管理员。")
                })
            } else {
              const data = await db.read(dbName)
              let reply :string = `${dbName}<br>------<br>`
              data.map((e) => reply = `${reply}${e}<br>`)
              renderAdmin(reply)
                .then((url) => {
                  resolve([`[CQ:image,file=${url}]`,`图片消息发送失败了＞﹏＜，请前往 ${url} 查看！（链接有效期 1 天）`])
                })
                .catch((error) => {
                  log.error(`renderAdmin: ${error.toString()}`)
                  resolve("发生致命错误，已上报给管理员。")
                })
            }
          } else {
            resolve("错误：不正确的数据库名（osu、food、vw50）！")
          }
          break

        case "echo":
          const input: string = msg.slice(2).join(" ")
          if (input) {
            resolve(input)
          } else {
            resolve("传入了空字符串！")
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