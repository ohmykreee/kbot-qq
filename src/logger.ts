import { exit } from 'process'
import { config } from '../botconfig'
import { adminNotify } from './app'

// 用于存储以往的日志，以后改为文件读写操作
const logHistory :Array<string> = []

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
    const reply :string = `${getDateString()} [DEBUG]: ${text}`
    saveLog(reply)
    console.log(reply)
  }
}

/**
 * 输出 Info 级别的日志
 *
 * @param text - 日志需要输出的字符串
 * 
 */
function logInfo(text :string) :void {
  const reply :string = `${getDateString()} [INFO]: ${text}`
  saveLog(reply)
  console.log(reply)
}

/**
 * 输出 Warn 级别的日志
 *
 * @param text - 日志需要输出的字符串
 * 
 */
function logWarn(text :string) :void {
  const reply :string = `${getDateString()} [WARN]: ${text}`
  saveLog(reply)
  console.log(reply)
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
  const reply :string = `${getDateString()} [ERROR]: ${text}`
  adminNotify(reply)
  saveLog(reply)
  console.log(reply)
  process.exitCode = 1
}

/**
 * 输出 Fatal 级别的日志
 *
 * @remarks
 * 输出日志后，延时5秒以异常代码（1）退出程序
 * 
 * @param text - 日志需要输出的字符串
 * 
 */
 function logFatal(text :string) :void {
  const reply :string = `${getDateString()} [FATAL]: ${text}`
  adminNotify(reply)
  saveLog(reply)
  console.log(reply)
  setTimeout(() => {
    exit(1)
  }, 5000)
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

/**
 * 保存历史日志以供查询
 *
 * @remarks
 * 目前是保存在 {@link logHistory} 数组中，并且每次执行会删除超过上限的日志
 *
 * @param logtext - 需要保存的日志字符串
 * 
 */
function saveLog(logtext :string) :void {
  logHistory.push(logtext)
  if (logHistory.length > config.maxloghistory) {
    logHistory.splice(0, logHistory.length - config.maxloghistory)
    log.debug('logHistory trim has been triggered.')
  }
}

/**
 * 获取历史日志
 *
 * @remarks
 * 返回指定数目的最近日志，若请求数目大于当前日志数目，则返回当前所有日志。若当前无日志，则返回一个空数组。
 *
 * @param count - 请求返回日志的数目
 * @param callback - 回调函数，返回值为一个包含指定数目日志的数组
 * 
 */
export function readLog(count :number, callback:(logs :Array<string>) => void) :void {
  callback(logHistory.slice(-count))
}