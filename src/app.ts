import { config } from "../botconfig"
import { WebSocket } from "ws"
import { msgHandler } from "./handler"
import { startIRC } from "./irc"
import { exit } from "process"

// 用于定义用于存储传入消息的变量
interface msg {
  raw_text :string,
  text? :string,
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

// 初始化日志记录库
const SimpleNodeLogger = require('simple-node-logger'),
	opts = {
		// logFilePath:'mylogfile.log',
		timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS'
	},
log = SimpleNodeLogger.createSimpleLogger( opts )

// 初始化 WebSocket，并传入事件触发函数
const client = new WebSocket(config.url + '?access_token=' + config.token)
client.addEventListener('message', function (event) {
  ifNeedResponed(JSON.parse(event.data as string))
})
client.addEventListener('error', function(event) {
  log.error(`websocket error: ${event.error}`)
})
client.addEventListener('close' ,function(event) {
  log.error(`connection closed: ${event.reason}`)
  exit(1)
})
// 启动 irc.ts 中的 slate-irc 初始化
startIRC()

/**
 * 当接收到 go-cqhttp 任意内容时触发
 *
 * @remarks
 * 由 WebSocket 的 message 事件触发
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
      user_id: data.sender.user_id as number
    }
    // 判断前缀是否为 kreee/Kreee，如是则除去前6个字符
    if (/^[Kk]reee/g.test(msg.raw_text)) {
      msg.text = msg.raw_text.slice(6)
      log.info(`[${msg.user_id}] ${msg.text}`)
      // 判断是否为群消息，如是则传入群号至对应变量，判断完成传入处理后的内容至 fetchResponse()
      if(msg.message_type === 'group') {
        msg.group_id = data.group_id
        fetchResponse(msg)
      } else {
        fetchResponse(msg)
      }
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
 * 将来自 {@link ifNeedResponed()} 接收的消息字符串传递给 {@link msgHandler()} ,经过简单处理后并构造回复所需要的 object，传递给 {@link makeResponse()}
 *
 * @param msg - 接收消息的 object
 * 
 */
function fetchResponse(msg: msg) :void {
  // 执行来自 handler.ts 的 msgHandler()，并通过回调函数获取文字结果
  msgHandler(msg.text as string, function callback(reply) {
    const res :msg_response = {
      message_type: msg.message_type,
      text: reply,
      user_id: msg.user_id,
    }
    // 判断是否返回没有命中规则的默认回复，是则写入日志警告
    if(res.text === '智商有点低，听不懂捏') {
      log.warn(`mismatch text:${msg.raw_text}`)
    }
    // 判断是否为群消息，如是则在消息结尾加上at，并传入群号
    if (res.message_type === 'group') {
      res.group_id = msg.group_id,
      res.text = res.text + `\n[CQ:at,qq=${res.user_id}]`
    }
    // 判断是否在开发模式，如是则在消息结尾加上 (Dev mode)
    if (config.debug) {
      res.text = res.text + `\n(Dev mode)`
    }
    // 传入消息至 makeResponse()，回复消息
    makeResponse(res)
  })
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
    message_type: res.message_type
  }
  // 判断是否为群消息，如是则传入群号
  if (res.message_type === 'group') {
    msg_params.group_id = res.group_id
  // 如果 message_type 不是 group 或是 private，则输出错误并终止程序
  } else if (res.message_type !== 'group' && res.message_type !== 'private') {
  log.error(`makeResponse: message_type is out of range: ${res.message_type}`)
  exit(1)
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
  // 判断是否为心跳事件
  } else if (data.post_type == 'meta_event' && data.meta_event_type == 'heartbeat') {
    log.info(`heartbeat interval=${data.interval}`)
  // 无法判断时直接输出至日志
  } else {
    log.warn(`unhandled: ${JSON.stringify(data)}`)
  }
}