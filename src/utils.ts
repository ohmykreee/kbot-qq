import type { gokapiReply_types } from "./types.js"
import config from "../botconfig.js"
import { log } from "./logger.js"
import axios from "axios"
import FormData from "form-data"

/**
 * 获取 osu!api token
 *
 * @remarks
 * 文档 {@link https://osu.ppy.sh/docs/index.html#client-credentials-grant}，适用范围仅为 public
 *
 * @return Promise<string>，返回值为 osu!api token 字符串
 * 
 */
export function getOsuToken() :Promise<string> {
  return new Promise((resolve, reject) => {
    axios.post("https://osu.ppy.sh/oauth/token", {
      client_id: config.osuClientId,
      client_secret: config.osuClientSecret,
      grant_type: "client_credentials",
      scope: "public"
    })
      .then(res => {
        resolve(res.data.access_token)
      })
      .catch((error) => {
        log.error(`osu-get-token: ${error.toString()}`)
        reject(error)
      })
  })
}

/**
 * 上传文件至 Gokapi 实例
 *
 * @remarks
 * Gokapi 项目地址及Api文档 {@link https://github.com/Forceu/Gokapi}
 *
 * @param file - 需要上传的文件，类型为 ArrayBuffer 或 Buffer
 * @param filename - 需要上传文件的文件名
 * @param expiryDays - 过期天数（0 为无限制）
 * @param allowedDownloads - 允许下载次数（0 为无限制）
 * @param password - （可选）访问密码
 * 
 * @returns Promise<gokapiReply> ，返回值为 {@link gokapiReturn}
 * 
 */
export function uploadToGokapi(file :ArrayBuffer, filename :string, expiryDays :number, allowedDownloads :number, password? :string) :Promise<gokapiReply_types> {
  return new Promise((resolve, reject) => {
    //构建 post 需要的主体
    const postForm :FormData = new FormData()
    postForm.append("file", file, filename)
    postForm.append("allowedDownloads", allowedDownloads)
    postForm.append("expiryDays", expiryDays)
    if (password) { postForm.append("password", password) }
    axios.post(config.gokapiUrl + "files/add", postForm , {
      headers: {'apikey': config.gokapiToken, 'Content-Type': 'multipart/form-data'},
    })
      .then(res => {
        const reply :gokapiReply_types = {
          url: `${res.data.Url}${res.data.FileInfo.Id}`,
          hotlinkUrl: res.data.FileInfo.HotlinkId? `${res.data.HotlinkUrl}${res.data.FileInfo.HotlinkId}`:undefined,
          expirDays: expiryDays,
          allowedDownloads: allowedDownloads,
          password: password? password:undefined
        }
        resolve(reply)
      })
      .catch((error) => {
        log.error(`gokapi: ${error.toString()}`)
        reject(error)
      })
  })
}