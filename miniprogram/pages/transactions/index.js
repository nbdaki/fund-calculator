// pages/transactions/index.js
const db = wx.cloud.database();

Page({
  data: {
    showModal: false,
    date: '',
    nav: '',
    count: '',
    recordList: [],
    planList: [],
    planOptions: [],
    selectedPlanIndex: 0,
    selectedPlanId: '',
    selectedPlanAmount: ''
  },

  onShow() {
    this.loadPlans();
  },

  loadPlans() {
    db.collection('plan').orderBy('createTime', 'desc').get().then(res => {
      const planList = res.data;
      const planOptions = planList.length ? planList.map(item => item.fundName || item.fundCode || '未命名计划') : ['请选择计划'];
      const selectedPlanId = planList.length ? planList[0]._id : '';
      this.setData({ planList, planOptions, selectedPlanIndex: 0, selectedPlanId }, () => {
        this.loadRecords();
      });
    }).catch(err => {
      console.error('获取计划失败', err);
      wx.showToast({ title: '获取计划失败', icon: 'none' });
    });
  },

  loadRecords() {
    const { selectedPlanId } = this.data;
    if (!selectedPlanId) {
      this.setData({ recordList: [] });
      return;
    }

    db.collection('transaction').where({ plan_id: selectedPlanId }).orderBy('createTime', 'desc').get().then(res => {
      this.setData({ recordList: res.data });
    }).catch(err => {
      console.error('获取记录失败', err);
      wx.showToast({ title: '获取记录失败', icon: 'none' });
    });
  },

  showModal() {
    const selectedPlan = this.data.planList.find(item => item._id === this.data.selectedPlanId) || {};
    this.setData({
      showModal: true,
      date: '',
      nav: '',
      count: '',
      selectedPlanAmount: selectedPlan.amount || ''
    });
  },

  choosePlan(e) {
    const selectedPlanIndex = e.detail.value;
    const selectedPlan = this.data.planList[selectedPlanIndex] || {};
    const selectedPlanId = selectedPlan._id || '';
    const selectedPlanAmount = selectedPlan.amount || '';
    this.setData({ selectedPlanIndex, selectedPlanId, selectedPlanAmount }, () => {
      this.loadRecords();
    });
  },

  hideModal() {
    this.setData({
      showModal: false,
      date: '',
      nav: '',
      count: ''
    });
  },

  chooseDate(e) {
    this.setData({ date: e.detail.value });
  },
  updateCount(nav, amount) {
    const unitNav = parseFloat(nav);
    const investAmount = parseFloat(amount);
    if (Number.isNaN(unitNav) || unitNav <= 0 || Number.isNaN(investAmount) || investAmount <= 0) {
      this.setData({ count: '' });
      return;
    }
    const shares = investAmount / unitNav;
    this.setData({ count: shares.toFixed(2) });
  },
  inputNav(e) {
    let nav = e.detail.value;
    if (nav.includes('.')) {
      const [intPart, decPart] = nav.split('.');
      nav = intPart + '.' + decPart.slice(0, 4);
    }
    const { selectedPlanAmount } = this.data;
    this.setData({ nav }, () => this.updateCount(nav, selectedPlanAmount));
  },

  saveRecord() {
    const { date, nav, count, selectedPlanId, selectedPlanAmount } = this.data;
    if (!date || !nav || !count || !selectedPlanId || !selectedPlanAmount) {
      wx.showToast({ title: '请填写完整', icon: 'none' });
      return;
    }

    const planAmount = parseFloat(selectedPlanAmount);
    const unitNav = parseFloat(nav);
    const unitCount = parseFloat(count);

    if (Number.isNaN(unitNav) || unitNav <= 0 || Number.isNaN(unitCount) || unitCount <= 0 || Number.isNaN(planAmount) || planAmount <= 0) {
      wx.showToast({ title: '请填写正确的数值', icon: 'none' });
      return;
    }

    const newItem = {
      date,
      amount: planAmount.toFixed(2),
      nav: unitNav.toFixed(4),
      count: unitCount.toFixed(2),
      fee: '0.00',
      plan_id: selectedPlanId,
      createTime: new Date()
    };

    db.collection('transaction').add({
      data: newItem
    }).then(res => {
      this.loadRecords();
      this.setData({ showModal: false, date: '', nav: '', count: '' });
      wx.showToast({ title: '保存成功' });
    }).catch(err => {
      console.error('保存失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) {
      return;
    }
    wx.showModal({
      title: '删除确认',
      content: '确定要删除这条交易记录吗？',
      success: res => {
        if (res.confirm) {
          db.collection('transaction').doc(id).remove().then(() => {
            this.loadRecords();
            wx.showToast({ title: '删除成功' });
          }).catch(err => {
            console.error('删除失败', err);
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  }
});