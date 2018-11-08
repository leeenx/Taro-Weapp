/**
 * @description swiper小灵通
 * 一个通用 swiper 的尝试
 * 1. TaroSwiper.registerSwiper 定义一种 swiper 范式
 * 2. TaroSwiper.createSwiper(swiperName<string>) 创建上步定义的 swiper 实例
 * 3. swiper.next() & swiper.prev() 来控制 swiper 向前还是后切换
 * 4. swiper.pause() & swiper.play() 暂停与播放
 * 5. swiper.stop() 停止 swiper 的所有活动，next() & prev() 也会失效
 * 6. swiper.resume() 从 stop 状态恢复过来
 */
import Taro from '@tarojs/taro'
import { View } from '@tarojs/components'
import { getSwiper } from './smart-swiper-register'

// swiper 的默认值
const defaultSwiperConfig = {
  state: null,
  auto: true,
  stay: 2000,
  duration: 600,
  timingFunction: 'linear',
  onSwiperUpdate: null,
  // 手势方向，有三个值：x, y, none
  motion: 'none'
}

// 生成一个 React 组件
export default class SmartSwiper extends Taro.Component {
  // 默认值不设值
  static defaultProps = {
    swiperId: -1
  }
  // 已经安装上的 swiper
  swiper = undefined
  // 安装 swiper
  addSwiper = swiper => {
    const { onSwiperUpdate = () => {} } = swiper.config
    const dispatchSwiperUpdate = (...arg) => onSwiperUpdate(...arg)
    swiper.onUpdate(
      animStates => {
        dispatchSwiperUpdate(animStates)
      }
    )
    this.swiper = swiper
  }
  // 更新 swiper 的配置
  updateSwiper (props) {
    const swiper = getSwiper(props.swiperId)
    if (swiper === undefined) {
      this.removeSwiper()
      return
    } else if (swiper !== this.swiper) {
      this.addSwiper(swiper)
    }
    const {
      controller: ctrl,
      prevConfig = {}
    } = swiper
    // 与默认配置wgua
    const config = Object.assign({}, defaultSwiperConfig, swiper.config || {})
    const {
      state,
      auto,
      stay,
      duration,
      timingFunction,
      onSwiperUpdate,
      motion
    } = config
    // 检查 swiper 是否需要更新配置
    if (state === null || onSwiperUpdate === null) {
      console.error('swiper.config 缺少关键选项：state 或 onSwiperUpdate')
      return
    }
    // options 更新
    if (
      state !== prevConfig.state ||
      state.length !== prevConfig.stateLen ||
      auto !== prevConfig.auto ||
      stay !== prevConfig.stay ||
      duration !== prevConfig.duration ||
      timingFunction !== prevConfig.timingFunction
    ) {
      ctrl.set({
        state,
        auto,
        stay,
        options: { duration, timingFunction }
      })
    }
    // 挂载 motion
    this.swiper.motion = motion
    // 更新配置
    this.swiper.prevConfig = {
      state,
      stateLen: state.length,
      auto,
      stay,
      duration,
      timingFunction
    }
  }
  // 移除 swiper
  removeSwiper = () => {
    if (this.swiper !== undefined) {
      this.swiper.destory()
      this.swiper.prevConfig = {}
      this.swiper = undefined
    }
  }
  // 手势控制
  finger = {
    x0: 0,
    y0: 0,
    lock: false
  }
  handleTouchstart = e => {
    if (this.swiper === undefined || this.swiper.motion === 'none') return
    const touches = e.targetTouches || e.changedTouches
    this.finger.x0 = touches[0].pageX
    this.finger.y0 = touches[0].pageY
    // 暂停自动播放
    this.swiper.controller.auto = false
  }
  handleTouchmove = e => {
    if (
      this.swiper === undefined ||
      this.swiper.motion === 'none' ||
      this.finger.lock === true
    ) return
    const touches = e.targetTouches || e.changedTouches
    const { pageX: x, pageY: y } = touches[0]
    const { x0, y0 } = this.finger
    const offset = { main: x - x0, cross: y - y0 }
    if (this.swiper.motion === 'y') {
      // 运动的方向是 Y轴，主副轴互换
      [offset.main, offset.cross] = [offset.cross, offset.main]
    }
    if (Math.abs(offset.main) - Math.abs(offset.cross) > 0) {
      e.preventDefault()
      if (offset.main > 0) {
        // 向后
        this.swiper.prev()
      } else {
        // 向前
        this.swiper.next()
      }
      this.finger.lock = true
    }
  }
  handleTouchend = () => {
    if (this.swiper === undefined || this.swiper.motion === 'none') return
    this.finger = {
      x0: 0,
      y0: 0,
      lock: false
    }
    // 恢复自动播放
    this.swiper.controller.auto = this.swiper.config.auto
  }
  handleTouchcancel = () => {
    this.handleTouchend()
  }
  componentDidMount () {
    // 初始化 swiper
    this.updateSwiper(this.props)
  }
  componentWillReceiveProps (nextProps) {
    this.updateSwiper(nextProps)
  }
  render () {
    const slider = this.props.children
    return (
      <View
        onTouchStart={this.handleTouchstart.bind(this)}
        onTouchMove={this.handleTouchmove.bind(this)}
        onTouchEnd={this.handleTouchend.bind(this)}
        onTouchCancel={this.handleTouchcancel.bind(this)}
      >
        { slider }
      </View>
    )
  }
}
