import { msg_types, plugin_types } from "../../src/types.js"
import { pluginSendMsg } from "../../src/plugin.js"

class PluginClass implements plugin_types {
  constructor() {
    // 在这里更改你的插件信息
    this.name = "example-plugin"
    this.version = "v1.0.0"

    this.start = this.start
    this.stop = this.stop
    this.receiver = this.receiver
  }

  name :string
  version :string

  start() :Promise<void> {
    return new Promise ((resolve) => {
      // 在这里执行一些启动插件需要的动作
      // console.log("load example-plugin")
      resolve()
    })
  }

  stop() :Promise<void> {
    return new Promise((resolve) => {
      // 在这里执行一些停止插件前需要的动作
      // console.log("unload example-plugin")
      resolve()
    })
  }

  receiver(msg: msg_types): Promise<void | msg_types> {
    return new Promise ((resolve) => {
      // 例子：当传入的命令检测为 kbot v1 版本命令时，回复提示信息
      if (/^[Kk]reee[ ,，]/g.test(msg.raw_text)) {
        const reply :msg_types = {
          raw_text: `检测到旧版本的命令格式，请使用 “/help” 获取最新命令格式！${msg.group_id? `\n[CQ:at,qq=${msg.user_id}]`:""}`,
          message_type: msg.message_type,
          user_id: msg.user_id,
          group_id: msg.group_id? msg.group_id:undefined
        }
        resolve(reply)
      }
      resolve()
    })
  }
}

// 如果需要主动发送信息，请使用 pluginSendMsg()，用法同上
function SendMsg () :void {
  const msg :msg_types = {
    raw_text: "reply goes here",
    message_type: "private",
    user_id: 123456789
  }
  pluginSendMsg(msg)
}

// 请勿更改以下内容
const Plugin = new PluginClass()
export default Plugin