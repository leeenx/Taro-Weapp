import {
  useMemo,
  useState,
  useEffect,
  useCallback
} from 'react';
import objectEntries from 'object.entries';

/**
 * @author 01392692
 * @description react hooks 里使用 class组件一样的state
 * @param {Object} state 
 */
interface StateCallback {
  (): void;
};
interface SetState {
  (state, setStateComplete: StateCallback): void;
  (state): void;
};
interface SetStateComplete<State> {
  (state: State): void;
};
export function useStateHook<HookState>(state: HookState): [HookState, SetState] {
    const myState: HookState = useMemo(() => state, []);
    let updateValue = 0;
    const [update, setUpdate] = useState(updateValue);
    const afterUpdateQueue: Array<StateCallback> = useMemo(() => ([]), []);
    const afterUpdate = useCallback((cb) => {
      afterUpdateQueue.push(cb);
    }, []);

    useEffect(() => {
      // 遍历回调
      afterUpdateQueue.forEach((cb: StateCallback) => cb());
      // 清空长度
      afterUpdateQueue.length = 0;
    }, [update]);
    const setState: SetState = useCallback((
      newState,
      setStateComplete: SetStateComplete<HookState> = () => { }
    ) => {
      // 直接更新状态（这里与 class 组件的 this.state 表示不一样）
      Object.assign(myState, newState);
      updateValue += 1;
      setUpdate(updateValue);
      afterUpdate(() => {
        setStateComplete(myState);
      });
    }, []);
    return [myState, setState];
  };

  /**
 * @author 01392692
 * @description 用来替代 npm 包的 classnames，因为本项目使用 BEM 写样式，类名太长会影响书写与文件体积
 */

interface KeyValue {
	[key: string]: boolean;
};

type ArgItem = string | KeyValue;
type Args = Array<ArgItem>;

function classnames (baseClass: string, ...args: Args): string {
	return args.map(item => {
		if (typeof(item) === 'string') {
			return `${baseClass}__${item}`;
		} else {
			// KeyValue 类型
			return objectEntries(item)
				.filter(([, value]) => value)
				.map(([key]) => `${baseClass}__${key}`)
				.join(' ');
		}
	}).join(' ');
};

// 挂载一个静态讨论过

/**
 * @author 01392692
 * @description classnames 的 hooks
 * @param baseClass 类型前缀
 */
export function useClassnames (baseClass: string) {
  return (...args: Args): string => classnames(baseClass, ...args);
};
