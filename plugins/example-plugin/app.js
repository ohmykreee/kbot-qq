// 此处修改插件信息
const pluginInfo = {
  name: "example-plugin",
  version: "v2.0.0"
}

// 以下内容请勿随意修改！
function sendMsg(data, type) {
  if (type === "startup") {
    process.send && process.send({type: "startup", data: data})
  } else {
    process.send && process.send({type: "message", data: data})
  }
}
sendMsg(pluginInfo, "startup")
process.on("message", data => {
  if (typeof data === "object") {
    handleMsg(data)
  } else {
    handleStop(data)
  }
})

// 在此函数处编写相关程序
//
// msg 的类型为 msg_types，具体如下：
// interface msg_types {
//   raw_text :string,
//   message_type :string,
//   group_id? :number,
//   user_id :number
// }
//
function handleMsg(msg) {
  if (/^[Kk]reee[ ,，]/g.test(msg.raw_text)) {
    const reply = {
      raw_text: `检测到旧版本的命令格式，请使用 “/help” 获取最新命令格式！${msg.group_id? `\n[CQ:at,qq=${msg.user_id}]`:""}`,
      message_type: msg.message_type,
      user_id: msg.user_id,
      group_id: msg.group_id? msg.group_id:undefined
    }
    sendMsg(reply) // 发送消息，类型为 msg_types
  }
}

// 在此函数编写插件退出时的清理动作
// code: 退出代码，为数字
async function handleStop(code) {
  // console.log(`${pluginInfo.name} unload, version: ${pluginInfo.version}.`)
  process.exit(code) // 必须带上这一行，否则程序将退出失败
}


// 当插件以异常状态停止时（如 process.exit(2) ），
// 插件管理器将在 3s 后自动重启该插件
// 插件直接输出的内容( console.log() )将和主程序共用一个输出

//TODO:
// 插件正常退出( process.exit(0) )会被判定为错误退出而触发重启