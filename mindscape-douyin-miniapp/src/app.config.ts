export default defineAppConfig({
  pages: [
    'pages/diary/index',
    'pages/index/index',
    'pages/mine/index',
    'pages/webview/index',
    'pages/diaryDetail/index',
    'pages/scrapbook/index',
    'pages/diaryEdit/index',
    'pages/theme/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'MindScape',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#4E5969',
    selectedColor: '#6D5DFE',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/diary/index',
        text: '日记'
      },
      {
        pagePath: 'pages/index/index',
        text: '查阅'
      },
      {
        pagePath: 'pages/mine/index',
        text: '设置'
      }
    ]
  }
})
