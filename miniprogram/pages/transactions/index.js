// pages/transactions/index.js
const db = wx.cloud.database();

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
    this.loadRecords();
  },

  loadRecords() {
    db.collection('transaction').orderBy('createTime', 'desc').get().then(res => {
      this.setData({ recordList: res.data });
    }).catch(err => {
      console.error('获取记录失败', err);
      wx.showToast({ title: '获取记录失败', icon: 'none' });
    });
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
      createTime: new Date()
    };

    db.collection('transaction').add({
      data: newItem
    }).then(res => {
      this.loadRecords(); // 重新加载记录
      this.setData({ showModal: false, date: '', price: '', count: '', fee: '', total: '' });
      wx.showToast({ title: '保存成功' });
    }).catch(err => {
      console.error('保存失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  }
})