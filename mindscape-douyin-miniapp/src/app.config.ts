export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/diary/index',
    'pages/mine/index',
    'pages/webview/index',
    'pages/diaryDetail/index'
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
        pagePath: 'pages/index/index',
        text: '首页'
      },
      {
        pagePath: 'pages/diary/index',
        text: '日记'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
})
