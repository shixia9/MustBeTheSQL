import store from 'store';

const USER_KEY = 'user_key';

// 定义用户类型
export interface UserInfo {
  id: number;
  username: string;
  tokenQuota?: number;
  [key: string]: any; // 允许其他字段
}

export default {
  // 保存用户
  saveUser(user: UserInfo): void {
    store.set(USER_KEY, user);
  },

  // 读取用户
  getUser(): UserInfo | null {
    return store.get(USER_KEY) || null;
  },

  // 删除用户
  deleteUser(): void {
    store.remove(USER_KEY);
  },
};