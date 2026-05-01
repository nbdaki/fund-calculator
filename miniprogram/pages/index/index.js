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
      annualizedReturn: ''
    },
  },

  onShow() {
    this.loadRecords();
    this.loadMarketSummary();
    this.loadStockPrice();
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
        totalAmount: { $sum: '$total' }
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
              marketValue: '',
              profitLabel: '',
              profitAmount: '',
              profitColor: ''
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

  computeMarketValue() {
    const { marketSummary, stockInfo } = this.data;
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
    if (totalAmount > 0 && marketSummary.earliestDate) {
      const startDate = new Date(marketSummary.earliestDate);
      const today = new Date();
      const dayDiff = Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      if (!Number.isNaN(startDate.getTime()) && dayDiff > 0) {
        const rate = Math.pow(marketValue / totalAmount, 365 / dayDiff) - 1;
        const sign = rate >= 0 ? '+' : '-';
        annualizedReturn = `${sign}${Math.abs(rate * 100).toFixed(2)}`;
      }
    }
    this.setData({
      'marketSummary.marketValue': marketValue.toFixed(2),
      'marketSummary.profitLabel': profitLabel,
      'marketSummary.profitAmount': Math.abs(profit).toFixed(2),
      'marketSummary.profitColor': profitColor,
      'marketSummary.annualizedReturn': annualizedReturn
    });
  }
})