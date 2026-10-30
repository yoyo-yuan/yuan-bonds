export const STRINGS = {
  no_account: "尚无账号",
  alert_dup: "已有同名账号！",
  alert_no_acc: "请先新增账号！",
  del_confirm: "确定删除「{name}」的所有进度？此操作无法复原。",
  import_ok: "导入成功！",
  import_fail: "导入失败：文件格式不正确。",
  select_all_cancel: "全选 / 取消",
  remain: "剩 {n}",
  msg_0: "还没开始收集，今天就出发吧！🎯",
  msg_25: "加油！才刚起步，继续累积吧 💪",
  msg_50: "不错！已完成 {pct}%，继续冲！🔥",
  msg_75: "太强了！已过一半，只剩 {left} 格！⚡",
  msg_99: "快收集完啦！只剩 {left} 格，加把劲！🏃",
  msg_100: "🎉 全部收集完成！你是羁绊收藏大师！",
  bond_pos: "一拍即合",
  bond_neg: "貌合神离",
  unlock: "解锁",
  cancel_unlock: "取消",
  can_unlock: "✅ 目前可解锁",
  all_unlocked: "🎉 此情报所有组合今日已解锁！",
  done_group: "📁 已解锁",
  no_acc_hint: "请先建立账号",
  welcome: "欢迎使用鸢报羁绊助手",
  welcome_desc:
    "建立一个账号来开始记录你的羁绊收集进度<br>每个账号独立储存，可以切换不同角色使用",
  create_first: "＋ 建立第一个账号",
};

export function getLabel(key) {
  return STRINGS[key] || key;
}

export const weathers = {
  晴天: "assets/weather/35px-晴天.png",
  雨天: "assets/weather/35px-雨天.png",
  大雾: "assets/weather/35px-大雾.png",
  狂风: "assets/weather/35px-狂风.png",
  小雪: "assets/weather/35px-小雪.png",
  大雪: "assets/weather/35px-大雪.png",
  飓风: "assets/weather/35px-飓风.png",
  雷鸣: "assets/weather/35px-雷鸣.png",
};

export const allW = Object.keys(weathers);

export const ANNOUNCE_VERSION = 3;

export const deptOrder = ["蛾部", "雀部", "鸢部", "蜂部", "闲人"];
