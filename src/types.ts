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
 */
export interface msg_response_types {
  message_type :string,
  text :string,
  user_id :number,
  group_id? :number
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
  name :string
  version :string
  start() :Promise<void>
  stop() :Promise<void>
  receiver(msg :msg_types) :Promise<msg_types | void>
}