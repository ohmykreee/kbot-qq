import { config } from "../botconfig"
import { log } from "./logger"
import { createCanvas } from "canvas"
import axios from "axios"
import FormData from "form-data"

/**
 * 文字转图片
 *
 * @remarks
 * 使用 canvas
 *
 * @param text - 需要被生成的字符串
 * 
 * @returns 图片 CQ 码
 * 
 */
export function text2img(text :string) :string {
  // 创建一个虚拟的 canvas 用于计算字体所占位置
  const content = createCanvas(0, 0).getContext('2d')
  content.font='500 8px sans-serif'
  const textImg = content.measureText(text)
  // 正式用于生成图像的 canvas
  const canvasWidth :number = textImg.width + 10
  const canvasHeight :number = textImg.actualBoundingBoxAscent + textImg.actualBoundingBoxDescent + 10
  const radio :number = 2
  const canvas = createCanvas(canvasWidth * radio, canvasHeight * radio)
  const ctx = canvas.getContext('2d')
  ctx.scale(radio, radio)
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  ctx.font='500 8px sans-serif'
  ctx.fillStyle = "black"
  ctx.fillText(text, 5, textImg.actualBoundingBoxAscent + 5)
  return `[CQ:image,file=base64://${canvas.toDataURL().slice(22)}]`
}

/**
 * 获取 osu!api token
 *
 * @remarks
 * 文档 {@link https://osu.ppy.sh/docs/index.html#client-credentials-grant}，适用范围仅为 public
 *
 * @param callback - 回调函数，返回值为字符串
 * 
 */
export function getOsuToken(callback: (reply :string) => void) :void {
  axios.post("https://osu.ppy.sh/oauth/token", {
    client_id: config.osuclientid,
    client_secret: config.osuclientsecret,
    grant_type: "client_credentials",
    scope: "public"
  })
    .then(res => {
      callback(res.data.access_token)
    })
    .catch(function (error) {
      log.error(`osu-get-token: ${error.toString()}`)
    })
}

/**
 * 上传文件至 Gokapi 实例
 *
 * @remarks
 * Gokapi 项目地址及Api文档 {@link https://github.com/Forceu/Gokapi}
 *
 * @param file - 需要上传的文件，类型为 ArrayBuffer
 * @param filename - 需要上传文件的文件名
 * @param expiryDays - 过期天数（0 为无限制）
 * @param allowedDownloads - 允许下载次数（0 为无限制）
 * @param callback - 回调函数，返回值为 {@link gokapiReturn}
 * @param password - 访问密码（可选）
 * 
 */
export function uploadToGokapi(file :ArrayBuffer, filename :string, expiryDays :number, allowedDownloads :number, callback: (reply :gokapiReply) => void, password? :string) :void {
  //构建 post 需要的主体
  const postForm :FormData = new FormData()
  postForm.append("file", file, filename)
  postForm.append("allowedDownloads", allowedDownloads)
  postForm.append("expiryDays", expiryDays)
  if (password) { postForm.append("password", password) }
  axios.post(config.gokapiurl, postForm , {
    headers: {'apikey': config.gokapitoken, 'Content-Type': 'multipart/form-data'},
  })
    .then(res => {
      const reply :gokapiReply = {
        url: `${res.data.Url}${res.data.FileInfo.Id}`,
        hotlinkUrl: res.data.FileInfo.HotlinkId? `${res.data.HotlinkUrl}${res.data.FileInfo.HotlinkId}`:undefined,
        expirDays: expiryDays,
        allowedDownloads: allowedDownloads,
        password: password? password:undefined
      }
      callback(reply)
    })
    .catch(function (error) {
      log.error(`gokapi: ${error.toString()}`)
    })
}
// 构建回复所要用的 object 类型
interface gokapiReply {
  url :string,
  hotlinkUrl? :string,
  expirDays :number,
  allowedDownloads :number,
  password? :string
}