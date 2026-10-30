// 按时间从新到旧排列；新增公告时使用比上一条更大的数字 ID。
// ID 用于已读记录，请勿修改旧公告的 ID。bodyHtml 仅用于项目内维护的公告内容。
export const announcements = [
  {
    id: 4,
    date: "2026/10/31",
    title: "⚔️ 战斗羁绊收集上线",
    bodyHtml: `
      现在可以记录 <strong>战斗羁绊</strong> 的收集进度了！共收录
      <strong>21 组</strong>羁绊，涵盖合击、援护、转移与急诊。<br>
      点击右上角「⚔️
      战斗羁绊」按钮进入，点击羁绊标记已收集。再次点击右上角 ⚔️
      按钮，即可返回鸢报羁绊。<br><br>
      战斗羁绊与鸢报羁绊共用
      <strong>密探拥有状态</strong>，未拥有密探对应的羁绊会显示为不可收集。收集进度也会一并包含在导出备份中。
    `,
  },
  {
    id: 3,
    date: "2026/7/12",
    title: "🎉 羁绊资料更新",
    bodyHtml: `
      同步游戏 <strong>6月11日</strong> 版本更新的新增羁绊配队，共新增
      <strong>17 组</strong>羁绊，并新增
      <strong>陈纪、陈应</strong> 两位密探。<br>
      新增配对包含：安期×孙尚香、凌统×甘宁、陈群×陈纪、陈登×陈应、董奉×陈应、葛洪×司马徽、孔融×陈纪、张郃×陈应。<br><br>
      如鸢羁绊总数从 <strong>128 组</strong> 更新至
      <strong>142 组</strong>，代号鸢羁绊总数从
      <strong>159 组</strong> 更新至
      <strong>176 组</strong>。新增羁绊均已标注
      <span class="new-badge">NEW</span>，可在状态筛选「✨
      新羁绊」快速查看。
    `,
  },
  {
    id: 2,
    date: "2026/5/19",
    title: "🎉 如鸢羁伴资料大更新 + Bug 修复",
    bodyHtml: `
      同步如鸢服最新羁绊开放进度，新增
      <strong>31 组</strong>羁绊（原「代号鸢限定」现已在如鸢开放）：<br>
      凌统×祢衡、士燮×董奉、张燕×戏学、马超×董白、诸葛亮×周瑜、荀彧×荀攸、飞云×张绣、张绣×贾诩、凌统×朱然×虞翻、诸葛三兄弟、蔡琰×王异×刘豹、董奉×陈登×张邈、徐庶×令狐茂、诸葛瑾×诸葛诞、张昭×虞翻
      等。<br><br>
      如鸢羁绊总数从 <strong>97 组</strong> 更新至
      <strong>128 组</strong>。新增羁绊标注
      <span class="new-badge">NEW</span>，可在状态筛选「✨
      新羁绊」快速查看。<br><br>
      <strong>同步修复：</strong><br>
      • 切换账号时会重复弹出成就窗口 ✓<br>
      • 切换账号后密探灰色/蓝色状态未正确更新 ✓
    `,
  },
  {
    id: 1,
    date: "2026/5/1",
    title: "🆕 拆分「如鸢 / 代号鸢」资料",
    bodyHtml: `
      工具现在可以分别管理两服的进度了。<br>
      建立账号时选「<span class="server-badge ry" style="font-size: 0.7rem; padding: 2px 6px">🐤 如鸢</span>」或「<span class="server-badge dyy" style="font-size: 0.7rem; padding: 2px 6px">🦅 代号鸢</span>」即可。<br><br>
      点击顶部账号旁的服徽章可查看当前服资料详情。
    `,
  },
  {
    id: 0,
    date: "2026/4/28",
    title: "🎉 羁绊资料更新",
    bodyHtml: `
      已同步游戏 <strong>3月30日</strong> 与
      <strong>4月16日</strong> 两次版本更新的新增羁绊配对，共新增
      <strong>41 位</strong>密探（周瑜、诸葛亮、曹丕等）。<br>
      新增羁绊在开图鉴和资料留存中标注
      <span class="new-badge">NEW</span>，状态筛选选「✨
      新羁绊」可快速查看。
    `,
  },
];

export const latestAnnouncementId = announcements[0]?.id ?? 0;
