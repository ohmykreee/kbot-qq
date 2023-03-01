/**
 * 用于定义用于存储传入消息的变量
 * 
 */
export interface msg_types {
  raw_text :string,
  message_type :string,
  group_id? :number,
  user_id :number
}

/**
 * 用于定义用于存储回复消息的变量
 * 
 * auto_escape 在 onebot api 中未出现，这里为了方便传入额外添加（默认行为：false）
 */
export interface msg_response_types {
  message_type :string,
  text :string,
  user_id :number,
  group_id? :number
  auto_escape? :boolean
}

/**
 * 用于定义用于传给 go-cqhttp 的变量
 * 
 */
export interface msg_params_types {
  message_type :string,
  user_id :number,
  group_id? :number,
  message :string,
  auto_escape? :boolean
}

/**
 * 发送消息的echo字段的类型
 * 
 */
export interface echo_types {
  type: "message" | "admin" | "noreply"
  fallback?: string // 消息发送失败时发送的字符，之后要开放给 handler.ts 等，目前只是强制转换
  user_id: number
  message_type: string
  group_id?: number
}

/**
 * 用于定义部分功能的运行状态，并导出给全局
 * 
 */
export interface appStatus_types {
  isQuery :boolean,
  isMP :boolean
}

/**
 * uploadToGokapi() 回复所要用的 object 类型
 * 
 */
export interface gokapiReply_types {
  url :string,
  hotlinkUrl? :string,
  expirDays :number,
  allowedDownloads :number,
  password? :string
}

/**
 * 定义一个插件所需要的类型
 * 
 */
export interface plugin_types {
  name :string | undefined
  version :string | undefined
  stop() :Promise<void>
  receiver(msg :msg_types) :void
}

/**
 * 插件向主体传递版本信息
 * 
 */
export interface plugin_info_types {
  name: string
  version: string
}

/**
 * 插件向主体传递需要发送的消息
 * 
 */
export interface plugin_ipc {
  type: "startup" | "message"
  data: plugin_info_types | msg_response_types
}