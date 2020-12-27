/**
 * @author 01392692
 * @description 加载 http 协议头的图片，通过 onload 方法获取tempFilePath，目前是用来解决 iOS weChat 7.0.20 的 bug
 * @配合「webgl-get-image-data」来简便实现获取 tempFilePath
 */
import Taro, { useEffect, useScope } from '@tarojs/taro'
import { Canvas } from '@tarojs/components'
import { useStateHook } from '../../utils/user-hooks'
import webglGetImageData from '../../utils/webgl-get-image-data'

export default function HttpImage (props) {
	// 解构 props
	const {
		onLoad,
		onUpdate,
		imageList
	} = props
	const canvasId = 'http-image-canvas'
	const scope = useScope()
	// state
	const [state, setState] = useStateHook({
		width: 1,
		height: 1
	})
	
	const handleImageListChange = async () => {
		// imageList 有变化
		if (imageList.length > 0) {
			const tempFilePathList = await handleImageListLoad()
			onLoad && onLoad(tempFilePathList)
		}
	}

	const handleImageListLoad = () => new Promise(resolve => {
		// 排队下载图片
		const loadImageOneByOne = async loaded => {
			const len = imageList.length
			const index = loaded.length
			const imagePath = imageList[index]
			const res = await handleImageLoad(imagePath)
			loaded.push(res)
			if (index < len - 1) {
				loadImageOneByOne(loaded)
			} else {
				// 加载完成
				resolve(loaded)
			}
		}
		loadImageOneByOne([])
	})

	const handleImageLoad = imagePath => new Promise(async (resolve, reject) => {
		if (imagePath.indexOf('base64') === 0) {
			// base64不处理
			return resolve({
				imagePath,
				success: true,
				tempFilePath: imagePath
			})
		}
		const { width, height, imageData } = await webglGetImageData(imagePath)
		setState({ width, height }, () => {
			Taro.canvasPutImageData({
				x: 0,
				y: 0,
				width,
				height,
				canvasId,
				data: imageData,
				fail () {
					const err = {
						imagePath,
						success: false,
						errorMessage: 'canvasPutImageData调用失败'
					}
					onUpdate(err)
					reject(err)
				},
				success () {
					// 生成 tempFilePath，canvasPutImageData 有一定的延时，需要加个 setTimeout
					setTimeout(() => {
						handleCreateTempFilePath(imagePath, resolve, reject)
					}, 1000)
				}
			}, scope)
		});
	})
	const handleCreateTempFilePath = (imagePath, resolve, reject) => {
		const { width, height } = state
		Taro.canvasToTempFilePath({
			x: 0,
			y: 0,
			width,
			height,
			canvasId,
			destWidth: width,
			destHeight: height,
			fail () {
				const err = {
					imagePath,
					success: false,
					errorMessage: 'canvasToTempFilePath 调用失败'
				}
				onUpdate(err)
				reject(err)
			},
			success (res) {
				// 成功
				const { tempFilePath } = res
				const json = {
					imagePath,
					tempFilePath,
					success: true
				}
				onUpdate(json)
				resolve(json)
			}
		}, scope)
	}
	useEffect(handleImageListChange, imageList)
	// 解构 state
	const { width, height } = state
	return <Canvas
		canvasId={canvasId}
		style={{
			position: 'absolute',
			left: '100px',
			top: '100px',
			zIndex: 10000,
			width: `${width}px`,
			height: `${height}px`
		}}
	/>
}

HttpImage.defaultProps = {
	imageList: [],
	onLoad () {},
	onUpdate () {}
}

