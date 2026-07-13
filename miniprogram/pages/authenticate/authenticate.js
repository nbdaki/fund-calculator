Page({
  data: {
    status: '正在验证身份...'
  },

  onLoad() {
    this.handleAuthenticate();
  },

  handleAuthenticate() {
    const launchOptions = wx.getLaunchOptionsSync();
    const openId = launchOptions?.referrerInfo?.extraData?.openId || launchOptions?.query?.openId || '';

    if (!openId) {
      this.setData({ status: '未收到 openId' });
      wx.showToast({ title: '未收到 openId', icon: 'none' });
      this.returnToCaller({ success: false, openId: '', message: '缺少 openId' });
      return;
    }

    this.setData({ status: '正在校验身份...' });

    wx.cloud.database().collection('authenticated')
      .where({ openId })
      .get()
      .then((res) => {
        const isAuthenticated = Array.isArray(res.data) && res.data.length > 0;
        this.returnToCaller({
          success: isAuthenticated,
          openId,
          message: isAuthenticated ? '认证通过' : '未认证'
        });
      })
      .catch((err) => {
        console.error('校验 openId 失败', err);
        this.returnToCaller({ success: false, openId, message: '查询失败' });
      });
  },

  returnToCaller(result) {
    wx.navigateBackMiniProgram({
      extraData: result,
      success: () => {
        console.log('已返回原小程序');
      },
      fail: (err) => {
        console.error('返回原小程序失败', err);
        wx.showToast({ title: '返回原小程序失败', icon: 'none' });
      }
    });
  }
});
