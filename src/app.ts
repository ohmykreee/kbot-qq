import { config } from "../botconfig"
import { WebSocket } from "ws"
import { msgHandler } from "./handler"
import { adminHandler } from "./admin"
import { mpHandler } from "./mp"
import { startIRC } from "./online"
import { log } from "./logger"

// 用于定义用于存储传入消息的变量
interface msg {
  raw_text :string,
  message_type :string,
  group_id? :number,
  user_id :number
}

// 用于定义用于存储回复消息的变量
interface msg_response {
  message_type :string,
  text :string,
  user_id :number,
  group_id? :number
}

// 用于定义用于传给 go-cqhttp 的变量
interface msg_params {
  message_type :string,
  user_id :number,
  group_id? :number,
  message :string,
  auto_escape? :boolean
}

// 用于定义部分功能的运行状态，并导出给全局
interface appStatus {
  isQuery :boolean,
  isMP :boolean
}
export const appStatus :appStatus = {
  isQuery: false,
  isMP: false
}

// 初始化 WebSocket，并传入事件触发函数
const client = new WebSocket(config.url + '?access_token=' + config.token)
client.addEventListener('message', function (event) {
  ifNeedResponed(JSON.parse(event.data as string))
})
client.addEventListener('error', function(event) {
  log.error(`websocket error: ${event.error}`)
})
client.addEventListener('close' ,function(event) {
  log.fatal(`connection closed: ${event.reason}`)
})
// 启动 online.ts 中的 slate-irc 初始化
startIRC()

/**
 * 当接收到 go-cqhttp 任意内容时触发
 *
 * @remarks
 * 由 WebSocket 的 message 事件触发，并传递含处理过的text的msg给 {@link fetchResponse()}
 *
 * @param data - 接收消息的 object，内容可参考{@link https://github.com/botuniverse/onebot-11/blob/master/event/message.md}
 * 
 */
function ifNeedResponed(data :any) :void {
  // 判断是否为消息
  if (data.raw_message) {
    const msg :msg = {
      raw_text: data.raw_message as string,
      message_type: data.message_type as string,
      user_id: data.sender.user_id as number,
      group_id: data.message_type === 'group'? data.group_id as number:undefined
    }
    // 判断是否包含触发字符：/
    if (msg.raw_text.slice(0, 1) === '/') {
      const command :string = msg.raw_text.slice(1)
      // 判断是否是来自私聊的管理员的命令
      if (msg.message_type === 'private' && config.adminqq.includes(msg.user_id) && /^kbot/g.test(command)) {
        fetchResponse(msg, command, "admin")
        log.info(`[${msg.user_id}] [Admin] ${command}`)
      // 判断是否来自群聊的mp命令
      } else if (msg.message_type === 'group' && /^mp/g.test(command)) {
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
  } else {
    // 若判断为非消息，则传入 handleCallback 进行下一步处理
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
function fetchResponse(msg: msg, text :string, type :'admin' | 'mp' | 'main' | 'other') :void {
  const textArray: Array<string> = text.split(" ").filter(n => n.length > 0)

  // 封装一个方法，用于一些重复的操作
  const msgReply = (text :string) => {
    // 构建回复用主体
    const res :msg_response = {
      message_type: msg.message_type,
      text: text,
      user_id: msg.user_id,
      group_id: msg.message_type === "group"? msg.group_id:undefined
    }
    // 判断是否为群消息，如是则在消息结尾加上at
    if (res.message_type === "group") {
      res.text = res.text + `\n[CQ:at,qq=${res.user_id}]`
    }
    // 判断是否在开发模式，如是则在消息结尾加上 (Dev mode)
    if (config.debug) {
      res.text = res.text + "\n(Dev mode)"
    }
    // 传入消息至 makeResponse()，回复消息
    makeResponse(res)
  }

  // 判断消息的类型
  switch (type) {
    case "admin":
      adminHandler(textArray, function(reply) {
        msgReply(reply)
      })
      break
    case "mp":
      mpHandler(textArray, function(reply) {
        msgReply(reply)
      })
      break
    case "main":
      msgHandler(textArray, function(reply) {
        msgReply(reply)
      })
      break
    case "other":
      // 走一些命令前不带 / 的特殊字符
      // 比如 “确认” “取消”  等被动命令（广播式传给所有需要该命令的功能）
      //ToDo 可能做早安&晚安&打胶统计器，即距离上一次早安&晚安&打胶距离了多长时间，可能要用持续化数据库
      
      //处理一下旧版本的命令
      if (/^[Kk]reee[ ,，]/g.test(text)) {
        msgReply("检测到旧版本的命令格式，请使用 “/help” 获取最新命令格式！")
      }
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
function makeResponse(res :msg_response) :void {
  const msg_params :msg_params = {
    message: res.text,
    user_id: res.user_id,
    message_type: res.message_type,
    group_id: res.message_type === "group"? res.group_id:undefined
  }
  // 如果 message_type 不是 group 或是 private，则输出错误并终止程序
  if (res.message_type !== 'group' && res.message_type !== 'private') {
  log.fatal(`makeResponse: message_type is out of range: ${res.message_type}`)
  }
  // 构建发送给 go-cqhttp 的消息主体
  const msg_send :object = {
    "action": "send_msg" as string,
    "params": msg_params as msg_params,
    "echo": `Response to ${msg_params.user_id}`
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
 * @param data - 非接收消息的 object，内容可参考{@link https://github.com/botuniverse/onebot-11/blob/master/event/meta.md}
 * 
 */
function handleCallback(data :any) :void {
  // 判断是否为消息发送后的反馈
  if (data.echo) {
    log.info(`callback: ${data.status}, retcode:${data.retcode}, echo:${data.echo}`)
  // 判断是否为生命周期事件
  } else if (data.post_type == 'meta_event' && data.meta_event_type == 'lifecycle') {
    log.info(`${data.sub_type} user_id=${data.self_id}`)
    adminNotify(`${data.sub_type} user_id=${data.self_id}`)
  // 判断是否为心跳事件
  } else if (data.post_type == 'meta_event' && data.meta_event_type == 'heartbeat') {
    log.debug(`heartbeat interval=${data.interval}`)
  // 无法判断时直接输出至日志
  } else {
    log.warn(`unhandled: ${JSON.stringify(data)}`)
  }
}

/**
 * 发送私聊消息给管理员
 *
 * @remarks
 * 触发后发送单个消息给管理员，通过调用 {@link makeResponse()} 实现
 *
 * @param msg - 发送消息的字符串
 * 
 */
export function adminNotify(msg :string) :void {
  for (const QQid of config.adminqq) {
    const msg_params :msg_params = {
      message: `${msg}\n(for Admin) ${config.debug? "(Dev mode)":""}`,
      user_id: QQid,
      message_type: "private"
    }
    // 构建发送给 go-cqhttp 的消息主体
    const msg_send :object = {
      "action": "send_msg" as string,
      "params": msg_params as msg_params,
      "echo": `Send to admin ${msg_params.user_id}`
    }
    //通过 WebSocket 发送消息给 go-cqhttp
    client.send(JSON.stringify(msg_send))
  }
}