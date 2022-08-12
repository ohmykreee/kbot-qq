import { exit } from "process";
import { adminNotify } from "./app"
import { readLog } from "./logger";

/**
 * 处理来自管理员的消息并直接回复
 *
 * @remarks
 * 接受来自管理员消息的字符串，当该消息命中某种规则时，直接调用 {@link adminNotify()} 回复
 *
 * @param msg - 接收消息的字符串
 * 
 */
export function adminHandler(msg :string) :void {
  if (msg === 'help'|| msg === '帮助' || msg === 'h') {
    adminNotify(`所有可用命令：\n
restart/重启/stop/停止：停止程序并等待 daemon 重启程序\n
日志/log [数字]：获取最近指定数目的日志`)

  } else if (msg === 'restart' || msg === '重启' || msg === 'stop' || msg === '停止') {
    adminNotify(`请求成功，将在3秒后关闭程序，并等待 daemon 重启程序...`)
    setTimeout(() => {
      exit(0)
    }, 3000)

  } else if (/日志/g.test(msg) || /log/g.test(msg)) {
    // 如果请求中不包含数字则在末尾添加 5 来给予一个默认值
    if (!(/\d+/.test(msg))) { msg = msg + '5' }
    let count :number = parseInt(msg.match(/\d+/g)!.join(''), 10)
    // 如果 count 为 0 则给予一个默认值 5
    if (count === 0) { count = 5 }
    readLog(count, function(logs) {
      let reply :string = ''
      for (const context of logs) {
        reply = `${reply}${context.text}\n`
      }
      adminNotify(reply)
    })
  } else {
    adminNotify('命令错误，请使用命令“帮助”来获取所有可用命令！')
  }
}