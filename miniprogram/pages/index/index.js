// pages/index/index.js
const db = wx.cloud.database();

Page({
  data: {
    showModal: false,
    money: '',
    desc: '',
    recordList: [],
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
    this.loadRecords();
    this.loadMarketSummary();
    this.loadStockPrice();
  },

  loadRecords() {
    db.collection('transaction').orderBy('createTime', 'desc').get().then(res => {
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

  loadStockPrice() {
    this.setData({ stockLoading: true, 'stockInfo.error': '' });
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getStockPrice',
        code: 'sh513300'
      },
      success: (res) => {
        if (res && res.result && res.result.success) {
          this.setData({
            stockInfo: {
              code: res.result.code,
              name: res.result.name,
              prevClose: res.result.prevClose,
              error: ''
            },
            stockLoading: false
          }, () => {
            this.computeMarketValue();
          });
        } else {
          this.setData({
            'stockInfo.error': res.result && res.result.errMsg ? res.result.errMsg : '获取行情失败',
            stockLoading: false
          });
        }
      },
      fail: (err) => {
        console.error('获取行情失败', err);
        this.setData({
          'stockInfo.error': '获取行情失败',
          stockLoading: false
        });
      }
    });
  },

  loadMarketSummary() {
    const db = wx.cloud.database();
    db.collection('transaction').aggregate()
      .project({
        date: '$date',
        count: { $toInt: '$count' },
        total: { $toDouble: '$total' }
      })
      .group({
        _id: null,
        earliestDate: { $min: '$date' },
        totalCount: { $sum: '$count' },
        totalAmount: { $sum: '$total' },
        transactionCount: { $sum: 1 }
      })
      .end()
      .then(res => {
        const summary = res.list && res.list[0];
        if (summary) {
          this.setData({
            marketSummary: {
              earliestDate: summary.earliestDate || '',
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