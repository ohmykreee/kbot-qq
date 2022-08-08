import { exit } from 'process'
import { config } from '../botconfig'
 
/**
 * 封装日志格式化输出
 *
 * @remarks
 * 支持 debug、info、warn、error，分别由 {@link logDebug()}、{@link logInfo()}、{@link logWarn()}、{@link logError()} 处理
 *
 * @param text - 日志需要输出的字符串
 * 
 */
export const log = {
  debug: logDebug,
  info: logInfo,
  warn: logWarn,
  error: logError,
  fatal: logFatal
}

/**
 * 输出 Debug 级别的日志
 *
 * @remarks
 * 当 {@link config.debug} 为真时输出
 * 
 * @param text - 日志需要输出的字符串
 * 
 */
function logDebug(text :string) :void {
  if (config.debug) {
    console.log(`${getDateString()} [DEBUG]: ${text}`)
  }
}

/**
 * 输出 Info 级别的日志
 *
 * @param text - 日志需要输出的字符串
 * 
 */
function logInfo(text :string) :void {
  console.log(`${getDateString()} [INFO]: ${text}`)
}

/**
 * 输出 Warn 级别的日志
 *
 * @param text - 日志需要输出的字符串
 * 
 */
function logWarn(text :string) :void {
  console.log(`${getDateString()} [WARN]: ${text}`)
}

/**
 * 输出 Error 级别的日志
 * 
 * @remarks
 * 输出日志同时以将退出码标记为1
 * 
 * @param text - 日志需要输出的字符串
 * 
 */
function logError(text :string) :void {
  console.log(`${getDateString()} [ERROR]: ${text}`)
  process.exitCode = 1
}

/**
 * 输出 Fatal 级别的日志
 *
 * @remarks
 * 输出日志同时以异常代码（1）退出程序
 * 
 * @param text - 日志需要输出的字符串
 * 
 */
 function logFatal(text :string) :void {
  console.log(`${getDateString()} [FATAL]: ${text}`)
  exit(1)
}

/**
 * 获取当前格式化后的时间字符串
 * 
 * @return 当前格式化后的时间字符串
 * 
 */
function getDateString() :string {
  const dateObject = new Date()
  // 处理时区问题
  const offset = dateObject.getTimezoneOffset()
  const now :string = new Date(dateObject.getTime() - (offset*60*1000)).toISOString()
  return `[${now.slice(0, 10)} ${now.slice(11, -1)}]`
}