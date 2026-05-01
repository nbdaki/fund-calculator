// pages/index/index.js
const db = wx.cloud.database();

Page({
  data: {
    showModal: false,
    money: '',
    desc: '',
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

  // 保存记录到云数据库
  saveRecord() {
    const { money, desc } = this.data;
    if(!money) {
      wx.showToast({ title: '请输入金额', icon:'none' })
      return;
    }
    // 组装数据
    let newItem = {
      time: new Date(),
      money: money,
      desc: desc,
      type: 'fund' // 区分基金记录
    };

    db.collection('transaction').add({
      data: newItem
    }).then(res => {
      this.loadRecords(); // 重新加载记录
      this.setData({
        showModal: false,
        money: '',
        desc: ''
      });
      wx.showToast({ title: '保存成功' });
    }).catch(err => {
      console.error('保存失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  }
})