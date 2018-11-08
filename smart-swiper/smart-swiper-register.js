/**
 * @description Taro 通用 swiper 设计
 * 1. TaroSwiper.registerSwiper 定义一种 swiper 范式
 * 2. TaroSwiper.createSwiper(swiperName<string>) 创建上步定义的 swiper 实例
 * 3. swiper.controller.next() & swiper.controller.prev() 来控制 swiper 向前还是后切换
 * 4. swiper.controller.auto = true | false 是否自动播放
 * 5. swiper.controller.pause = true, 停止 swiper 的所有活动，next() & prev() 也会失效
 * 6. swiper.controller.pause = false, 恢复
 */
import Taro from '@tarojs/taro'
import './create-animation'

const APIs = [
  'matrix',
  'matrix3d',
  'rotate',
  'rotate3d',
  'rotateX',
  'rotateY',
  'rotateZ',
  'scale',
  'scale3d',
  'scaleX',
  'scaleY',
  'scaleZ',
  'skew',
  'skewX',
  'skewY',
  'translate',
  'translate3d',
  'translateX',
  'translateY',
  'translateZ',
  'opacity',
  'backgroundColor',
  'width',
  'height',
  'left',
  'right',
  'top',
  'bottom'
]

let cancelAnimationData = null

if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
  const animation = Taro.createAnimation({
    duration: 0,
    delay: 0,
    timingFunction: 'step-start'
  })
  // 为小程序生成一份 cancelAnimationData
  APIs.forEach(
    api => {
      if (api !== 'step' && api !== 'export') {
        animation[api].length > 0 ? animation[api](null) : animation[api]()
      }
    }
  )
  cancelAnimationData = animation.step().export()
}

function createAnimation (
  {
    duration = 400,
    delay = 0,
    timingFunction = 'linear',
    transformOrigin = '50% 50% 0'
  } = {}
) {
  // 动画默认项
  const defaultOptions = { duration, delay, timingFunction, transformOrigin }
  const animation = {}
  let store = []
  // 组合动画
  let steps = []

  // 将 api 的名字挂载到 animation
  APIs.forEach(
    api => {
      animation[api] = (...arg) => {
        store.push([ api, arg ])
        return animation
      }
    }
  )
  // step
  animation.step = function (options) {
    store.push(['step', [ options, defaultOptions ]])
    steps.push(store)
    store = []
    return animation
  }
  // export
  animation.export = function () {
    const data = steps
    steps = []
    return data
  }
  return animation
}

// 存放 swiper 实例的队列
const swiperCache = { count: 0 }

// Swiper 类
class Swiper {
  constructor (
    {
      runway = [],
      startPort = null,
      endPort = null,
      sleep = null,
      beginFrom = 0
    } = {}
  ) {
    // T台最多可以显示的数量
    this.max = runway.length
    this.runway = runway
    this.startPort = startPort
    this.endPort = endPort
    this.sleep = sleep
    this.beginFrom = beginFrom
    // 总链
    this.chain = [startPort, ...runway, endPort]
  }
  animation = Taro.createAnimation()
  // 状态列表
  state = []
  stateCount = 0
  // 代理状态
  proxy = []
  // 消息更新勾子
  onUpdate = handler => {
    this.handleUpdate = handler
  }
  // 处理勾子消息的方法
  handleUpdate = () => {}
  // 分派消息
  dispatchUpdate (...arg) {
    this.handleUpdate(...arg)
  }
  // T台实际显示数量
  count = 0
  // 播放控制器
  controller = {
    isPaused: false,
    isAuto: false,
    get auto () {
      return this.isAuto
    },
    set auto (value) {
      if (this.isAuto !== value) {
        this.isAuto = value
        if (this.pause === false) {
          value === false ? clearTimeout(this.sto) : this.play()
        }
      }
    },
    sto: null,
    stayTime: -1,
    get pause () {
      return this.isPaused
    },
    set pause (value) {
      if (this.isPaused !== value) {
        this.isPaused = value
        if (this.auto === true) {
          value === true ? clearTimeout(this.sto) : this.play()
        }
      }
    },
    get stay () {
      return this.stayTime
    },
    set stay (value) {
      if (this.stayTime !== value) {
        this.stayTime = value
        // 清除上次的自动播放
        this.sto && clearTimeout(this.sto)
        this.auto === true && this.play()
      }
    },
    next: () => this.next(),
    prev: () => this.prev(),
    play () {
      clearTimeout(this.sto)
      // 自动播放
      this.sto = setTimeout(
        () => {
          this.next()
          this.auto === true && this.play()
        },
        this.stay
      )
    },
    set: options => this.set(options)
  }
  // 设置 state
  set ({ state = null, options = null, auto = null, stay = null } = {}) {
    if (
      state !== null && (
        this.state.length !== this.stateCount ||
        this.state !== state
      )
    ) {
      // 重置 state
      this.state = state
      // 重置 swiper
      this.reset()
    }
    // 有选项传入，相当于重新生成动画
    if (options !== null) {
      const needUpdate = this.chain.every(
        steps => steps.every(
          item => {
            const last = item.length - 1
            // 获取 step API
            const step = item[last]
            const [, [ , defaultOptions ] ] = step
            let pass = true
            for (const key in defaultOptions) {
              if (options[key] !== undefined && defaultOptions[key] !== options[key]) {
                // 不相同 - 同步
                defaultOptions[key] = options[key]
                // 标记不通过
                pass = false
              }
            }
            // 如果 defaultOptions 与 options 相同，表示不需要更新
            if (pass === true) return false
            return true
          }
        )
      )
      // 选项需要更新
      if (needUpdate === true) {
        this.computed = {}
      }
    }
    // 自动播放
    if (auto !== null) this.controller.auto = auto
    // 停留时长
    if (stay !== null) this.controller.stay = stay
    return this
  }

  // 重置 swiper
  reset () {
    this.destory()
    this.init()
  }
  // 销毁
  destory () {
    this.state.fill(cancelAnimationData)
    this.computed = {}
    // 停止
    this.controller.pause = true
    this.stateCount = 0
  }
  // 初始化
  init () {
    // 使用 state 的索引作值
    const proxy = this.state.map((item, index) => index)
    this.stateCount = proxy.length
    // 舞台上的数量
    this.count = Math.min(this.runway.length, this.stateCount)
    // 更新起始坐标
    for (let i = 0; i < this.beginFrom; ++i) {
      proxy.push(proxy.shift())
    }
    this.proxy = proxy
    this.controller.pause = false
    // 控制播放
    if (this.controller.auto === true) {
      this.controller.play()
    }
    // 更新
    this.update('initial')
  }
  // 按传入的键值还原动画
  reduce (key = '', options = {}) {
    const steps = (
      key === 'startPort' || key === 'endPort' || key === 'sleep'
    ) ? this[key] : this.runway[key]
    // 没有数据
    if (key === '' || steps === undefined || steps.length === 0) return
    steps.forEach(
      step => step.forEach(
        ([ api, arg ]) => {
          if (api !== 'step') {
            // 动画API
            this.animation[api](...arg)
          } else {
            const [initOptions, defaultOptions] = arg
            // 合成最后的动画选项
            options = Object.assign({}, defaultOptions, initOptions, options)
            this.animation.step(options)
          }
        }
      )
    )
  }
  // 运动来源与目的
  from (start) {
    return { to: end => this.to(end, start) }
  }
  to (end, start = '') {
    const fromTo = `${start}_${end}`
    const cache = this.computed[fromTo]
    // 有记录，返回记录
    if (cache !== undefined) {
      return cache
    }
    // from 是无补间动画
    this.reduce(start,
      {
        duration: 1,
        delay: 0,
        timingFunction: 'step-start'
      }
    )
    // 表示定住不动
    if (end !== 'stick') {
      this.reduce(end)
    }
    if (end === 'startPort' || end === 'endPort') {
      // 离开的元素需要转到休息区
      this.reduce('sleep')
    }
    const animation = this.animation.export()
    // 缓存数据
    this.computed[fromTo] = animation
    return animation
  }
  stick (position) {
    return this.from(position).to('stick')
  }
  computed = {}
  // 向前播放
  next () {
    if (this.controller.pause === true) return
    this.proxy.push(this.proxy.shift())
    this.update('next')
  }
  prev () {
    if (this.controller.pause === true) return
    this.proxy.unshift(this.proxy.pop())
    this.update('prev')
  }
  // 更新
  update (direction) {
    const { proxy, state, count } = this
    const first = 0
    const last = count - 1
    switch (direction) {
      case 'next': {
        for (let i = 0; i < last; ++i) {
          const index = proxy[i]
          state[index] = this.to(i)
        }

        // 先头后尾部才可以保证所有情况正常

        // 保证头部出去运动正常
        const stateHead = proxy[this.stateCount - 1]
        state[stateHead] = this.to('startPort')

        // 保证尾部进入运动正常
        const stateTail = proxy[last]
        state[stateTail] = this.from('endPort').to(last)

        break
      }
      case 'prev': {
        for (let i = 1; i <= last; ++i) {
          const index = proxy[i]
          state[index] = this.to(i)
        }
        // 保证头部进入运动正常
        const stateHead = proxy[first]
        state[stateHead] = this.from('startPort').to(first)
        // 保证尾部出去运动正常
        const stateTail = proxy[count]
        state[stateTail] = this.to('endPort')
        break
      }
      default: {
        // 默认是初始化
        for (let i = 0, len = this.stateCount; i < len; ++i) {
          const index = proxy[i]
          if (i < count) {
            // 前台区
            state[index] = this.stick(i)
          } else {
            // 后台区 - 休息区
            state[index] = this.stick('sleep')
          }
        }
        break
      }
    }
    // 通知更新
    this.dispatchUpdate(state)
  }
}

// 注册
export function registerSwiper (register = () => {}) {
  // 返回注册数据
  const registerData = register(createAnimation)
  // 没有数据返回
  if (registerData === undefined) return
  const { runway, access, sleep, beginFrom = 0 } = registerData
  if (runway.length === 0) {
    console.warn('注册失败：runway 为空')
    return
  }
  if (access.length < 2) {
    throw new Error('access参数格式不对')
  }
  const [ startPort, endPort ] = access
  const swiper = new Swiper({ runway, startPort, endPort, sleep, beginFrom })
  // 给 swiper 挂载一个 id 值
  swiper.id = `swiper_${++swiperCache.count}`
  swiperCache[swiper.id] = swiper
  return swiper
}

export function getSwiper (id) {
  return swiperCache[id]
}
