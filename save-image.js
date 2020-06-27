import Taro from '@tarojs/taro'
// 下载文件
function downloadFile (url) {
    return new Promise((resolve, reject) => {
        Taro.downloadFile({
            url,
            success(res) {
                resolve(res.tempFilePath)
            },
            fail () {
                reject({
                    success: false,
                    message: '图片下载失败'
                })
            }
        })
    })
}

// 写文件
const fs = Taro.getFileSystemManager()
function writeFile (base64) {
    return new Promise((resolve, reject) => {
        const filePath = `${Taro.env.USER_DATA_PATH}/poster_${Date.now()}.png`
        const startIdx = base64.indexOf('base64,') + 7
        const data = base64.substring(startIdx)
        fs.writeFile({
            filePath,
            data,
            encoding: 'base64',
            success () {
                // 保存成功
                resolve(filePath)
            },
            fail () {
                reject({
                    success: false,
                    message: '图片保存到相册失败'
                })
            }
        })
    })
}

// 保存图片到相册
function saveImageToPhotosAlbum (filePath) {
    return new Promise((resolve, reject) => {
        Taro.saveImageToPhotosAlbum({
            filePath,
            success() {
                resolve({
                    success: true,
                    message: '图片保存成功'
                })
            },
            fail () {
                reject({
                    success: false,
                    message: '图片保存到相册失败'
                })
            }
        })
    })
}

// 检查保存图片的授权情况
function checkAuthorization () {
    return new Promise((resolve, reject) => {
        Taro.getSetting({
            success (res) {
                if (!res.authSetting['scope.writePhotosAlbum']) {
                    // 未授权
                    Taro.authorize({
                        scope: 'scope.writePhotosAlbum',
                        success () {
                            resolve({ success: true })
                        },
                        fail (err) {
                            if (err.errMsg.indexOf('auth deny') !== -1) {
                                // 用户拒绝授权
                                Taro.showModal({
                                    title: '请进入设置中心授权',
                                    content: '开启「保存到相册」',
                                    confirmText: '设置',
                                    cancelText: '取消',
                                    success (res) {
                                        if (res.confirm) {
                                            // 点了确定
                                            Taro.openSetting({
                                                success (res) {
                                                    if (res.authSetting['scope.writePhotosAlbum']) {
                                                        // 权限设置成功
                                                        resolve({ success: true })
                                                    } else {
                                                        reject({
                                                            success: false,
                                                            message: '用户未开启「保存到相册」权限'
                                                        })
                                                    }
                                                },
                                                fail () {
                                                    // 调用接口失败
                                                    reject({
                                                        success: false,
                                                        message: '打开设置中心异常'
                                                    })
                                                }
                                            })
                                        } else {
                                            // 点了取消
                                            reject({
                                                success: false,
                                                message: '拒绝进入设置中心授权'
                                            })
                                        }
                                    },
                                    fail() {
                                        reject({
                                            success: false,
                                            message: '授权异常'
                                        })
                                    }
                                })
                            } else {
                                reject({
                                    success: false,
                                    message: '抱歉，保存图片需要授权'
                                })
                            }
                        }
                    })
                } else {
                    resolve({ success: true })
                }
            }
        })
    })
}

export function downloadImageToPhotosAlbum (url) {
    return checkAuthorization().then(() =>
        downloadFile(url).then(saveImageToPhotosAlbum)
    )
}

export function saveBase64ToPhotosAlbum (base64) {
    return checkAuthorization().then(() => {
        writeFile(base64).then(saveImageToPhotosAlbum)
    })
}
