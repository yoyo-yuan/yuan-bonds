// Combination/type facts transcribed from the linked BWIKI table (revision 87926).
// Battle collection is stored separately from weather/action progress.
export const battleBondSource = {
  url: "https://wiki.biligame.com/yuan/密探羁绊/太史慈甘宁#战斗羁绊",
  revision: 87926,
  checkedOn: "2026-10-30",
};
export const battleBondTypes = ["合击", "援护", "转移", "急诊"];
export const battleBonds = [
  {
    id: "battle-1",
    members: ["郭嘉"],
    displayName: "郭嘉 × 全体密探",
    // Only 郭嘉 is required for filtering and ownership; retain the save key.
    collectionKey: "郭嘉_全体密探_合击",
    type: "合击",
  },
  {
    id: "battle-2",
    members: ["飞云", "绣球"],
    type: "合击",
  },
  {
    id: "battle-3",
    members: ["蛾使", "雀使"],
    type: "合击",
  },
  {
    id: "battle-4",
    members: ["吕蒙", "陆逊"],
    type: "合击",
  },
  {
    id: "battle-5",
    members: ["马超", "张辽"],
    type: "合击",
  },
  {
    id: "battle-6",
    members: ["马超", "阿蝉"],
    type: "合击",
  },
  {
    id: "battle-7",
    members: ["张角", "干吉"],
    type: "合击",
  },
  {
    id: "battle-8",
    members: ["安期", "孙尚香"],
    type: "合击",
  },
  {
    id: "battle-9",
    members: ["马腾", "张邈"],
    type: "合击",
  },
  {
    id: "battle-10",
    members: ["颜良", "文丑"],
    type: "援护",
  },
  {
    id: "battle-11",
    members: ["吕蒙", "陆逊"],
    type: "援护",
  },
  {
    id: "battle-12",
    members: ["张辽", "阿蝉"],
    type: "援护",
  },
  {
    id: "battle-13",
    members: ["董奉", "陈登"],
    type: "援护",
  },
  {
    id: "battle-14",
    members: ["荀攸", "荀彧"],
    type: "援护",
  },
  {
    id: "battle-15",
    members: ["杨修", "郭嘉"],
    type: "转移",
  },
  {
    id: "battle-16",
    members: ["张修", "张角"],
    type: "转移",
  },
  {
    id: "battle-17",
    members: ["孙尚香", "孙权"],
    type: "转移",
  },
  {
    id: "battle-18",
    members: ["董奉", "张邈"],
    type: "急诊",
  },
  {
    id: "battle-19",
    members: ["吕布", "张辽"],
    type: "合击",
  },
  {
    id: "battle-20",
    members: ["吕布", "马超"],
    type: "合击",
  },
  {
    id: "battle-21",
    members: ["吕布", "阿蝉"],
    type: "援护",
  },
];
