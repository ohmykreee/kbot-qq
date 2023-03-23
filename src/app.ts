import type { msg_types, msg_response_types, msg_params_types, echo_types, appStatus_types } from "./types.js"
import config from "../botconfig.js"
import info from '../package.json' assert { type: "json" }
import db from "./db.js"
import { WebSocket } from "ws"
import { msgHandler } from "./handler.js"
import { adminHandler } from "./admin.js"
import { mpHandler } from "./mp.js"
import { startIRC } from "./online.js"
import { log } from "./logger.js"
import { pluginsLoad, pluginsUnload, pluginReceiveMsg } from "./plugin.js"

export const appStatus :appStatus_types = {
  isQuery: false,
  isMP: false
}

// 初始化 WebSocket
const client = new WebSocket(`${config.cqhttpUrl}${config.cqhttpToken? `?access_token=${config.cqhttpToken}`:undefined}`)
client.addEventListener('error', (event) => {
  log.error(`websocket error: ${event.error}`)
})
client.addEventListener('close', (event) => {
  log.fatal(`connection closed: ${event.reason}`)
})
client.addEventListener('message', (event) => {
  ifNeedResponed(JSON.parse(event.data as string))
})
// 在数据库准备好后执行接下来的任务
db.init()
  .then(() => {
    handleStart()
  })
  .catch((error) => {
    console.log(error.toString())
  })

// 在程序出现 kill/未知异常 时调用 handleExit() 
// TODO: 需要更多的测试确保稳定性
process.once('SIGINT', () => {process.stdin.resume(); handleExit(process.exitCode)})
process.once('SIGUSR1', () => {process.stdin.resume(); handleExit(process.exitCode)})
process.once('SIGUSR2', () => {process.stdin.resume(); handleExit(process.exitCode)})
// if (!config.debug) { process.on('uncaughtException', () => {process.stdin.resume(); handleExit(process.exitCode)}) }

/**
 * 在程序准备好启动后执行
 * 
 * @remarks
 * 目前仅在数据库载入数据完成后执行
 */
function handleStart() :void {
  // 启动 online.ts 中的 slate-irc 初始化
  startIRC()
  // 载入所有的插件
  pluginsLoad()
}

/**
 * 在程序关闭前执行处理
 * 
 * @remarks
 * 插件后事处理，以及保存所有数据库更改
 */
export async function handleExit(exitCode? :number) :Promise<void> {
  await pluginsUnload(process.exitCode)
  await db.unload()
  process.exit(exitCode)
}

/**
 * 当接收到 go-cqhttp 任意内容时触发
 *
 * @remarks
 * 由 WebSocket 的 message 事件触发，并传递含处理过的消息段给 {@link fetchResponse()}
 * 
 * 消息段类型可参考{@link https://github.com/botuniverse/onebot-11/blob/master/message/segment.md}
 *
 * @param data - 接收消息的 object，内容可参考{@link https://github.com/botuniverse/onebot-11/blob/master/event/message.md}
 * 
 */
function ifNeedResponed(data :any) :void {
  // 判断是否为消息
  switch(data.post_type) {
    case"message":
      const msg :msg_types = {
        raw_text: data.raw_message as string,
        message_type: data.message_type as string,
        user_id: data.sender.user_id as number,
        group_id: data.message_type === 'group'? data.group_id as number:undefined
      }
      // 判断是否包含触发字符：/
      if (Array.from(msg.raw_text)[0] === "/") {
        const command :string = msg.raw_text.slice(1)
        // 判断是否是来自私聊的管理员的命令
        if (msg.message_type === 'private' && config.adminQQ.includes(msg.user_id) && command.indexOf("kbot") === 0) {
          fetchResponse(msg, command, "admin")
          log.info(`[${msg.user_id}] [Admin] ${command}`)
        // 判断是否来自群聊的mp命令
        } else if (msg.message_type === 'group' && command.indexOf("mp") === 0) {
          fetchResponse(msg, command, "mp")
          log.info(`[${msg.user_id}] [mp] ${command}`)
        // 普通的带/的命令
        } else {
          fetchResponse(msg, command, "main")
          log.info(`[${msg.user_id}] ${command}`)
        }
      } else {
        fetchResponse(msg, msg.raw_text, "other")
      }
      break

    case"notice":
      handleNotify(data)
      break

    case "meta_event":
    case "request": // 请求事件
    default:
      // 若判断为源事件/非消息，则传入 handleCallback 进行下一步处理
      handleCallback(data)
  }
}

// 获取回复，主要通过 handler.ts
/**
 * 获取回复内容
 *
 * @remarks
 * 将来自 {@link ifNeedResponed()} 接收的消息字符串传递给 {@link msgHandler()} （管理员消息会传递给 {@link adminHandler()}，mp消息会传给{@link mpHandler()} ）,经过简单处理后并构造回复所需要的 object，传递给 {@link makeResponse()}
 *
 * @param msg - 接收消息的 object
 * @param text - 经过 {@link ifNeedResponed()} 处理过的消息字符串
 * @param type - 消息的类型，admin：管理员命令；mp：mp房间命令；main：包含触发字符/的命令；other：其他不包含触发字符/的命令
 * 
 */
function fetchResponse(msg: msg_types, text :string, type :'admin' | 'mp' | 'main' | 'other') :void {
  const textArray: Array<string> = text.split(" ").filter(n => n.length > 0)

  // 封装一个方法，用于一些重复的操作
  const msgReply = (reply :string | string[]) => {
    const output: {text: string, fallback: string} = { // 实在想不出变量名了
      text: "",
      fallback: ""
    }

    if (Array.isArray(reply) && reply.length > 1) {
      output.text = reply[0]
      output.fallback = reply[1]
    } else {
      if (typeof reply === "string") {
        output.text = reply
      } else {
        output.text = reply[0]
      }
      output.fallback = `消息被拦截了＞﹏＜,以下是被抢救的消息：\n\n${output.text.replaceAll(/(?<=\[CQ:(.*))(,(.*?))(?=\])/g, "")}`
    }

    // 构建回复用主体
    const res :msg_response_types = {
      message_type: msg.message_type,
      text: output.text,
      user_id: msg.user_id,
      group_id: msg.message_type === "group"? msg.group_id:undefined
    }
    // 消息发送失败时会使用 fallback 内消息
    const echo: echo_types = {
      type: "message",
      fallback: output.fallback,
      user_id: res.user_id,
      message_type: res.message_type,
      group_id: res.message_type === "group"? res.group_id:undefined
    }
    // 判断是否为群消息，如是则在消息结尾加上at
    if (res.message_type === "group") {
      res.text = res.text + `\n[CQ:at,qq=${res.user_id}]`
      echo.fallback = echo.fallback + `\n[to: ${res.user_id}]`
    }
    // 判断是否在开发模式，如是则在消息结尾加上 (Dev mode)
    if (config.debug) {
      res.text = res.text + "\n(Dev mode)"
      echo.fallback = echo.fallback + "\n(Dev mode)"
    }
    // 传入消息至 makeResponse()，回复消息
    makeResponse(res, echo)
  }

  // 判断消息的类型
  switch (type) {
    case "admin":
      adminHandler(textArray)
        .then ((reply) => {
          msgReply(reply)
        })
      break
    case "mp":
      mpHandler(textArray)
        .then((reply) => {
          msgReply(reply)
        })
      break
    case "main":
      msgHandler(textArray, msg.user_id)
        .then((reply) => {
          reply? msgReply(reply):pluginReceiveMsg(msg)  //非handler.ts中的命令现在会传递给插件
        })
      break
    case "other":
      // 走一些命令前不带 / 的特殊字符
      // 比如 “确认” “取消”  等被动命令（广播式传给所有需要该命令的功能）
      //TODO: 可能做早安&晚安&打胶统计器，即距离上一次早安&晚安&打胶距离了多长时间，可能要用持续化数据库
      // 有了插件系统可以非常方便的加一些临时/复杂功能
      
      // 传递消息给插件
      pluginReceiveMsg(msg)
  }
}

/**
 * 回复消息
 *
 * @remarks
 * 将来自 {@link fetchResponse()} 的内容封装后通过 WebSocket 传回给 go-cqhttp，回复消息
 *
 * @param res - 回复消息的 object
 * 
 */
export function makeResponse(res :msg_response_types, echo: echo_types) :void {
  const msg_params :msg_params_types = {
    message: res.text,
    user_id: res.user_id,
    message_type: res.message_type,
    group_id: res.message_type === "group"? res.group_id:undefined,
    auto_escape: res.auto_escape? true:false
  }
  // 如果 message_type 不是 group 或是 private，则输出错误并终止程序
  if (res.message_type !== 'group' && res.message_type !== 'private') {
    log.fatal(`makeResponse: message_type is out of range: ${res.message_type}`)
  }
  // 构建发送给 go-cqhttp 的消息主体
  const msg_send :object = {
    "action": "send_msg" as string,
    "params": msg_params as msg_params_types,
    "echo": JSON.stringify(echo)
  }
  //通过 WebSocket 发送消息给 go-cqhttp
  client.send(JSON.stringify(msg_send))
}

/**
 * 处理非消息类型的内容
 *
 * @remarks
 * 接收来自 {@link ifNeedResponed()} 的非接收消息的内容，并处理输出至日志中
 *
 * @param data - 非接收消息的 object，内容可参考{@link https://github.com/botuniverse/onebot-11/blob/master/event/notice.md}
 * 
 */
function handleCallback(data :any) :void {
  switch(data.meta_event_type) {
    case"lifecycle":
      // 生命周期事件
      log.info(`${data.sub_type} user_id=${data.self_id} version=${info.version}`)
      adminNotify(`${data.sub_type} user_id=${data.self_id} version=${info.version}`)
      break
    
    case"heartbeat":
      // 心跳事件
      log.debug(`heartbeat interval=${data.interval}`)
      break

    default:
      if (data.echo) {
        const echoIncome: echo_types = JSON.parse(data.echo)
        // 发送消息后的反馈
        log.info(`callback:${data.status}, retcode:${data.retcode}, reply:${echoIncome.user_id}, type:${echoIncome.type}`)
        if (data.status === "failed") {
          log.error(`callback:${data.status}, retcode:${data.retcode}, reply:${echoIncome.user_id}, type:${echoIncome.type}, info:${data.wording}`)
          if (echoIncome.type !== "noreply" && echoIncome.fallback) {
            // 将 fallback 内的消息发送回去
            const msg_params :msg_response_types = {
              text: echoIncome.fallback,
              user_id: echoIncome.user_id,
              message_type: echoIncome.message_type,
              group_id: echoIncome.group_id? echoIncome.group_id:undefined,
              auto_escape: true
            }
            const echo: echo_types = {
              type: "noreply",
              user_id: echoIncome.user_id,
              message_type: echoIncome.message_type,
              group_id: echoIncome.group_id? echoIncome.group_id:undefined
            }
            makeResponse(msg_params, echo)
          }
        }
      } else {
        // 无法判断时直接输出至日志
        log.debug(`unhandled: ${JSON.stringify(data)}`)
      }
  }
}

/**
 * 处理通知类型的内容
 *
 * @remarks
 * 接收来自 {@link ifNeedResponed()} 的通知的内容，目前只有戳一戳互戳
 *
 * @param data - 非接收消息的 object，内容可参考{@link https://github.com/botuniverse/onebot-11/blob/master/event/meta.md}
 * 
 */
function handleNotify(data :any) :void {
  switch(data.sub_type) {
    case"poke":
      // 戳一戳
      if (data.self_id === data.target_id) {
        const msg_params :msg_response_types = {
          text: `[CQ:poke,qq=${data.sender_id}]`,
          user_id: data.sender_id,
          message_type: data.group_id? "group":"private",
          group_id: data.group_id? data.group_id:undefined
        }
        const echo: echo_types = {
          type: "noreply",
          user_id: data.sender_id,
          message_type: data.group_id? "group":"private",
          group_id: data.group_id? data.group_id:undefined
        }
        makeResponse(msg_params, echo)
      }
      break

    default:
      // 无法判断时直接输出至日志
      log.debug(`unhandled notify: ${JSON.stringify(data)}`)
  }
}

/**
 * 发送私聊消息给管理员
 *
 * @remarks
 * 触发后发送单个消息给管理员
 *
 * @param msg - 发送消息的字符串
 * 
 */
export function adminNotify(msg :string) :void {
  for (const QQid of config.adminQQ) {
    const msg_params :msg_response_types = {
      text: `${msg}\n(for Admin) ${config.debug? "(Dev mode)":""}`,
      user_id: QQid,
      message_type: "private"
    }
    const echo: echo_types = {
      type: "admin",
      user_id: QQid,
      message_type: "private"
    }
    makeResponse(msg_params, echo)
  }
}