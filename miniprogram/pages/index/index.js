Page({
  data: {
    showModal: false,
    money: '',
    desc: '',
    recordList: []
  },

  onShow() {
    // 页面打开读取本地缓存
    let list = wx.getStorageSync('tradeRecord') || [];
    this.setData({ recordList: list });
  },

  showModal() {
    this.setData({ showModal: true });
  },
  hideModal() {
    this.setData({ 
      showModal: false,
      money: '',
      desc: ''
    });
  },

  inputMoney(e) {
    this.setData({ money: e.detail.value });
  },
  inputDesc(e) {
    this.setData({ desc: e.detail.value });
  },

  // 保存记录到本地
  saveRecord() {
    const { money, desc } = this.data;
    if(!money) {
      wx.showToast({ title: '请输入金额', icon:'none' })
      return;
    }
    // 组装数据
    let newItem = {
      time: new Date().toLocaleString(),
      money: money,
      desc: desc
    };
    let list = wx.getStorageSync('tradeRecord') || [];
    list.unshift(newItem); // 最新在最前面

    // 存入缓存 + 更新页面
    wx.setStorageSync('tradeRecord', list);
    this.setData({
      recordList: list,
      showModal: false
    })
    wx.showToast({ title: '保存成功' })
  }
})