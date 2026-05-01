Page({
  data: {
    showModal: false,
    date: '',
    price: '',
    count: '',
    fee: '',
    total: '',
    recordList: []
  },

  onShow() {
    let list = wx.getStorageSync('tradeRecord') || [];
    this.setData({ recordList: list });
  },

  showModal() {
    this.setData({ showModal: true });
  },
  hideModal() {
    this.setData({
      showModal: false,
      date: '',
      price: '',
      count: '',
      fee: '',
      total: ''
    });
  },

  // 5个输入框分别绑定
  inputDate(e) { this.setData({ date: e.detail.value }); },
  inputPrice(e) { this.setData({ price: e.detail.value }); },
  inputCount(e) { this.setData({ count: e.detail.value }); },
  inputFee(e) { this.setData({ fee: e.detail.value }); },
  inputTotal(e) { this.setData({ total: e.detail.value }); },

  // 保存
  saveRecord() {
    const { date, price, count, fee, total } = this.data;
    if (!date || !price || !total) {
      wx.showToast({ title: '请填写完整', icon: 'none' });
      return;
    }

    let newItem = {
      date, price, count, fee, total,
      createTime: new Date().toLocaleString()
    };

    let list = wx.getStorageSync('tradeRecord') || [];
    list.unshift(newItem);
    wx.setStorageSync('tradeRecord', list);

    this.setData({ recordList: list, showModal: false });
    wx.showToast({ title: '保存成功' });
  }
})