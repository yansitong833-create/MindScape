import dayjs from 'dayjs';
import type { DiaryEntry } from '@/types/diary';

/** 来自 data-single / preset-diaries.md，仅 2026 年 5 月 */
const PRESET_DIARIES_2026_05: Array<{ day: string; color: string; content: string }> = [
  { day: '05-31', color: '#92A8D1', content: "五月的最后一天，整理好了房间和心情，期待夏天的正式到来。" },
  { day: '05-30', color: '#F7CAC9', content: "尝试了新的烘焙食谱，虽然卖相一般，但味道意外地不错。" },
  { day: '05-29', color: '#9DC6C8', content: "傍晚的风很温柔，戴着耳机在公园散步，把烦恼都吹散了。" },
  { day: '05-28', color: '#8C9E82', content: "雨后的街道有泥土的芬芳，慢慢走回家的路上心情特别好。" },
  { day: '05-27', color: '#4A5568', content: "莫名其妙地情绪低落了一整天，不想说话，只想一个人静静待着。" },
  { day: '05-26', color: '#F4A460', content: "工作遇到了一点小瓶颈，但和同事头脑风暴后找到了突破口。" },
  { day: '05-25', color: '#87CEEB', content: "天气好得不像话，把被子拿出去晒，晚上会有阳光的味道吧。" },
  { day: '05-24', color: '#C49B7A', content: "喝到了一杯完美的焦糖玛奇朵，甜得像恋爱。" },
  { day: '05-23', color: '#B0C4DE', content: "终于完成了拖延已久的任务，今晚可以毫无负担地熬夜了。" },
  { day: '05-22', color: '#FFB6C1', content: "收到了一份意外的快递，是好久不见的朋友寄来的礼物。" },
  { day: '05-21', color: '#98FB98', content: "路边的蔷薇开得正好，忍不住停下来拍了好多张照片。" },
  { day: '05-20', color: '#708090', content: "以为会被记起的日子，结果什么也没发生，心里空落落的。" },
  { day: '05-19', color: '#E08F81', content: "参加了黑客松比赛，和团队一起熬夜写代码，累但充实。" },
  { day: '05-18', color: '#AFEEEE', content: "周一综合症有点严重，靠一杯冰美式强行开机。" },
  { day: '05-17', color: '#D8BFD8', content: "周末的慵懒时光，窝在沙发里撸猫，什么都不想做。" },
  { day: '05-16', color: '#F0E68C', content: "去郊外野餐，草地、蓝天和好朋友，这就是向往的生活。" },
  { day: '05-15', color: '#A8B4A5', content: "工作有些疲惫，但朋友突然发来一张好笑的表情包。" },
  { day: '05-14', color: '#FFDAB9', content: "发现了一家藏在巷子里的小酒馆，氛围感拉满。" },
  { day: '05-13', color: '#ADD8E6', content: "下雨天适合睡觉，听着雨声入眠，做了一个很长的梦。" },
  { day: '05-12', color: '#B8A890', content: "看着窗外的落叶发呆，什么也不想做，就这样刚刚好。" },
  { day: '05-11', color: '#E6E6FA', content: "开始学习一门新的语言，感觉大脑又被开发了一块新区域。" },
  { day: '05-10', color: '#FFB347', content: "陪妈妈过母亲节，她笑得很开心，我也很满足。" },
  { day: '05-09', color: '#98FF98', content: "坚持晨跑打卡第10天，流汗的感觉真的很爽。" },
  { day: '05-08', color: '#6C7A89', content: "安静地看了一下午的书，时间好像变慢了。" },
  { day: '05-07', color: '#FF6961', content: "遇到了一件倒霉事，但在便利店买到了最后一份喜欢的便当，被治愈了。" },
  { day: '05-06', color: '#77DD77', content: "项目终于上线了，团队一起去吃了顿大餐庆祝。" },
  { day: '05-05', color: '#AEC6CF', content: "假期余额不足，在家宅着充电，享受最后的宁静。" },
  { day: '05-04', color: '#FDFD96', content: "青年节去看了场话剧，演员的爆发力太强了，震撼。" },
  { day: '05-03', color: '#C4A882', content: "和朋友一起去了新开的画廊，灵感像泉水一样涌出来。" },
  { day: '05-02', color: '#CB99C9', content: "睡到自然醒，慢悠悠地做了个早午餐，假期的正确打开方式。" },
  { day: '05-01', color: '#FF6F61', content: "劳动节快乐！虽然哪里都没去，但给心灵放了个假。" },
];

const PRESET_MONTH = '2026-05';

const createSampleId = (date: string, index: number): string => {
  return `sample-${date}-${index}`;
};

export const generateSampleDiaryEntriesForMonth = (monthCursor: string): DiaryEntry[] => {
  if (monthCursor !== PRESET_MONTH) return [];

  return PRESET_DIARIES_2026_05.map((item, index) => {
    const date = dayjs(`2026-${item.day}`);
    return {
      id: createSampleId(date.format('YYYY-MM-DD'), 1),
      content: item.content,
      color: item.color,
      createdAt: date.hour(12).minute(10).second(0).millisecond(0).valueOf() + index,
    };
  }).sort((a, b) => b.createdAt - a.createdAt);
};
