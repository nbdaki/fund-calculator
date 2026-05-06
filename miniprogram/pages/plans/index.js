// pages/plans/index.js
const db = wx.cloud.database();

Page({
  data: {
    showModal: false,
    isEdit: false,
    currentId: '',
    date: '',
    fundCode: '',
    fundName: '',
    period: '',
    amount: '',
    planList: []
  },

  onShow() {
    this.loadPlans();
  },

  loadPlans() {
    db.collection('plan').orderBy('createTime', 'desc').get().then(res => {
      const planList = res.data.map((item, idx) => ({
        ...item,
        rowClass: idx % 2 === 0 ? 'even-row' : 'odd-row'
      }));
      this.setData({ planList });
    }).catch(err => {
      console.error('获取计划失败', err);
      wx.showToast({ title: '获取计划失败', icon: 'none' });
    });
  },

  showModal() {
    this.setData({ showModal: true });
  },

  editPlan(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      showModal: true,
      isEdit: true,
      currentId: item._id,
      fundCode: item.fundCode,
      fundName: item.fundName,
      date: item.date,
      period: item.period,
      amount: item.amount
    });
  },

  hideModal() {
    this.setData({
      showModal: false,
      isEdit: false,
      currentId: '',
      date: '',
      fundCode: '',
      fundName: '',
      period: '',
      amount: ''
    });
  },

  inputFundCode(e) {
    this.setData({ fundCode: e.detail.value });
  },

  inputFundName(e) {
    this.setData({ fundName: e.detail.value });
  },

  inputPeriod(e) {
    this.setData({ period: e.detail.value });
  },

  inputAmount(e) {
    this.setData({ amount: e.detail.value });
  },

  chooseDate(e) {
    this.setData({ date: e.detail.value });
  },

  savePlan() {
    const { fundCode, fundName, date, period, amount, isEdit, currentId } = this.data;
    if (!fundCode || !fundName || !period || !amount || !date) {
      wx.showToast({ title: '请填写完整', icon: 'none' });
      return;
    }

    const unitAmount = parseFloat(amount);
    if (Number.isNaN(unitAmount) || unitAmount <= 0) {
      wx.showToast({ title: '请填写正确的金额', icon: 'none' });
      return;
    }

    const item = {
      fundCode,
      fundName,
      date,
      period,
      amount: unitAmount.toFixed(2),
      createTime: new Date()
    };

    if (isEdit) {
      // 更新
      db.collection('plan').doc(currentId).update({
        data: item
      }).then(res => {
        this.loadPlans();
        this.setData({ showModal: false, isEdit: false, currentId: '', fundCode: '', fundName: '', period: '', amount: '', date: '' });
        wx.showToast({ title: '更新成功' });
      }).catch(err => {
        console.error('更新失败', err);
        wx.showToast({ title: '更新失败', icon: 'none' });
      });
    } else {
      // 新增
      db.collection('plan').add({
        data: item
      }).then(res => {
        this.loadPlans();
        this.setData({ showModal: false, fundCode: '', fundName: '', period: '', amount: '', date: '' });
        wx.showToast({ title: '保存成功' });
      }).catch(err => {
        console.error('保存失败', err);
        wx.showToast({ title: '保存失败', icon: 'none' });
      });
    }
  }
});