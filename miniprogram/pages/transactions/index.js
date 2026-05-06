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

  chooseDate(e) {
    this.setData({ date: e.detail.value });
  },
  updateTotal(price, count) {
    const unitPrice = parseFloat(price);
    const unitCount = parseInt(count, 10);
    if (Number.isNaN(unitPrice) || Number.isNaN(unitCount) || unitCount <= 0) {
      this.setData({ fee: '', total: '' });
      return;
    }
    const fee = unitPrice * unitCount * 0.0001;
    const total = unitPrice * unitCount + fee;
    this.setData({
      fee: fee.toFixed(2),
      total: total.toFixed(2)
    });
  },
  inputPrice(e) {
    const price = e.detail.value;
    const { count } = this.data;
    this.setData({ price }, () => this.updateTotal(price, count));
  },
  inputCount(e) {
    const count = e.detail.value;
    const { price } = this.data;
    this.setData({ count }, () => this.updateTotal(price, count));
  },
  inputFee() {
    // 手续费由系统自动计算，无需手动输入
  },

  saveRecord() {
    const { date, price, count, total } = this.data;
    if (!date || !price || !total) {
      wx.showToast({ title: '请填写完整', icon: 'none' });
      return;
    }

    const unitCount = parseInt(count, 10);
    const unitPrice = parseFloat(price);
    const fee = unitPrice * unitCount * 0.0001;
    const unitTotal = parseFloat((unitPrice * unitCount + fee).toFixed(2));

    if (Number.isNaN(unitPrice) || Number.isNaN(unitTotal) || Number.isNaN(unitCount) || unitCount <= 0) {
      wx.showToast({ title: '请填写正确的数值', icon: 'none' });
      return;
    }

    const newItem = {
      date,
      price: unitPrice.toFixed(3),
      count: unitCount,
      fee: fee.toFixed(2),
      total: unitTotal.toFixed(2),
      createTime: new Date()
    };

    db.collection('transaction').add({
      data: newItem
    }).then(res => {
      this.loadRecords();
      this.setData({ showModal: false, date: '', price: '', count: '', fee: '', total: '' });
      wx.showToast({ title: '保存成功' });
    }).catch(err => {
      console.error('保存失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  }
});