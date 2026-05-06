// pages/index/index.js
const db = wx.cloud.database();

Page({
  data: {
    showModal: false,
    money: '',
    desc: '',
    recordList: [],
    planList: [],
    planOptions: [],
    selectedPlanIndex: 0,
    selectedPlanId: '',
    stockInfo: {
      code: 'sh513300',
      name: '',
      prevClose: '',
      error: '',
    },
    stockLoading: false,
    marketSummary: {
      earliestDate: '',
      totalCount: 0,
      totalAmount: '0.00',
      marketValue: '',
      profitLabel: '',
      profitAmount: '',
      profitColor: '',
      annualizedReturn: '',
      irrReturn: '',
      irrColor: '',
      holdingDays: '',
      transactionCount: 0
    },
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
        this.loadMarketSummary();
        this.loadLatestNav();
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
      this.setData({ 
        recordList: res.data
      }, () => {
        this.computeMarketValue();
      });
    }).catch(err => {
      console.error('获取记录失败', err);
      wx.showToast({ title: '获取记录失败', icon: 'none' });
    });
  },

  loadLatestNav() {
    const { selectedPlanId } = this.data;
    if (!selectedPlanId) {
      this.setData({
        stockInfo: {
          code: '',
          name: '',
          prevClose: '',
          error: '请选择计划'
        }
      });
      return;
    }
    db.collection('transaction').where({ plan_id: selectedPlanId }).orderBy('createTime', 'desc').limit(1).get().then(res => {
      if (res.data && res.data.length > 0) {
        const latestTransaction = res.data[0];
        this.setData({
          stockInfo: {
            code: '',
            name: '',
            prevClose: latestTransaction.nav,
            error: ''
          },
          stockLoading: false
        }, () => {
          this.computeMarketValue();
        });
      } else {
        this.setData({
          stockInfo: {
            code: '',
            name: '',
            prevClose: '',
            error: '暂无交易记录'
          },
          stockLoading: false
        });
      }
    }).catch(err => {
      console.error('获取最新净值失败', err);
      this.setData({
        stockInfo: {
          code: '',
          name: '',
          prevClose: '',
          error: '获取净值失败'
        },
        stockLoading: false
      });
    });
  },

  choosePlan(e) {
    const selectedPlanIndex = e.detail.value;
    const selectedPlan = this.data.planList[selectedPlanIndex] || {};
    const selectedPlanId = selectedPlan._id || '';
    this.setData({ selectedPlanIndex, selectedPlanId }, () => {
      this.loadRecords();
      this.loadMarketSummary();
      this.loadLatestNav();
    });
  },

  loadMarketSummary() {
    const { selectedPlanId, planList } = this.data;
    if (!selectedPlanId) {
      this.setData({
        marketSummary: {
          earliestDate: '',
          totalCount: 0,
          totalAmount: '0.00',
          transactionCount: 0,
          marketValue: '',
          profitLabel: '',
          profitAmount: '',
          profitColor: '',
          irrColor: '',
          holdingDays: ''
        }
      });
      return;
    }
    const selectedPlan = planList.find(p => p._id === selectedPlanId);
    const earliestDate = selectedPlan ? new Date(selectedPlan.createTime).toISOString().split('T')[0] : '';
    db.collection('transaction').aggregate()
      .match({ plan_id: selectedPlanId })
      .project({
        date: '$date',
        count: { $toDouble: '$count' },
        amount: { $toDouble: '$amount' }
      })
      .group({
        _id: null,
        totalCount: { $sum: '$count' },
        totalAmount: { $sum: '$amount' },
        transactionCount: { $sum: 1 }
      })
      .end()
      .then(res => {
        const summary = res.list && res.list[0];
        if (summary) {
          this.setData({
            marketSummary: {
              earliestDate,
              totalCount: summary.totalCount || 0,
              totalAmount: ((summary.totalAmount || 0)).toFixed(2),
              transactionCount: summary.transactionCount || 0,
              marketValue: '',
              profitLabel: '',
              profitAmount: '',
              profitColor: '',
              irrColor: '',
              holdingDays: ''
            }
          }, () => {
            this.computeMarketValue();
          });
        } else {
          // 暂无交易记录时，置空相关数据
          this.setData({
            marketSummary: {
              earliestDate,
              totalCount: 0,
              totalAmount: '0.00',
              transactionCount: 0,
              marketValue: '',
              profitLabel: '',
              profitAmount: '',
              profitColor: '',
              irrColor: '',
              holdingDays: ''
            }
          });
        }
      })
      .catch(err => {
        console.error('获取聚合摘要失败', err);
      });
  },

  computeIRR(cashFlows, guess = 0.1) {
    const maxIteration = 100;
    const tolerance = 1e-6;
    let rate = guess;
    for (let i = 0; i < maxIteration; i++) {
      let npv = 0;
      let dnpv = 0;
      for (let j = 0; j < cashFlows.length; j++) {
        const { amount, years } = cashFlows[j];
        const discount = Math.pow(1 + rate, years);
        if (discount === 0) {
          continue;
        }
        npv += amount / discount;
        dnpv -= (years * amount) / (discount * (1 + rate));
      }
      if (Math.abs(npv) < tolerance) {
        return rate;
      }
      if (dnpv === 0) {
        break;
      }
      rate -= npv / dnpv;
      if (Math.abs(rate) > 1e10) {
        break;
      }
    }
    return null;
  },

  computeMarketValue() {
    const { marketSummary, stockInfo, recordList } = this.data;
    const totalCount = Number(marketSummary.totalCount || 0);
    const closePrice = parseFloat(stockInfo.prevClose);
    if (!totalCount || Number.isNaN(closePrice)) {
      return;
    }
    const marketValue = totalCount * closePrice;
    const totalAmount = parseFloat(marketSummary.totalAmount || 0);
    const profit = marketValue - totalAmount;
    const profitLabel = profit >= 0 ? '+' : '-';
    const profitColor = profit >= 0 ? 'profit' : 'loss';
    let annualizedReturn = '';
    let holdingDays = '';
    if (totalAmount > 0 && marketSummary.earliestDate) {
      const startDate = new Date(marketSummary.earliestDate);
      const today = new Date();
      const dayDiff = Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      if (!Number.isNaN(startDate.getTime()) && dayDiff > 0) {
        const rate = Math.pow(marketValue / totalAmount, 365 / dayDiff) - 1;
        const sign = rate >= 0 ? '+' : '-';
        annualizedReturn = `${sign}${Math.abs(rate * 100).toFixed(2)}`;
      }
      holdingDays = dayDiff;
    }
    let irrReturn = '';
    if (recordList && recordList.length > 0 && marketValue > 0) {
      const today = new Date();
      const cashFlows = recordList.map(item => {
        const date = new Date(item.date);
        const days = Math.max(0, Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)));
        return {
          amount: -(parseFloat(item.total) || 0),
          years: days / 365
        };
      });
      cashFlows.push({ amount: marketValue, years: 0 });
      const irr = this.computeIRR(cashFlows);
      if (irr !== null && !Number.isNaN(irr) && isFinite(irr)) {
        const sign = irr >= 0 ? '+' : '-';
        irrReturn = `${sign}${Math.abs(irr * 100).toFixed(2)}`;
      }
    }
    const irrColor = irrReturn >= 0 ? 'profit' : 'loss';

    this.setData({
      'marketSummary.marketValue': marketValue.toFixed(2),
      'marketSummary.profitLabel': profitLabel,
      'marketSummary.profitAmount': Math.abs(profit).toFixed(2),
      'marketSummary.profitColor': profitColor,
      'marketSummary.annualizedReturn': annualizedReturn,
      'marketSummary.irrColor': irrColor,
      'marketSummary.irrReturn': irrReturn,
      'marketSummary.holdingDays': holdingDays
    });
  }
})