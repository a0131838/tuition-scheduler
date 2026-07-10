const config = require("./config");

function app() {
  return getApp();
}

function token() {
  return app().globalData.token || wx.getStorageSync("parent_token") || "";
}

function staffToken() {
  return app().globalData.staffToken || wx.getStorageSync("staff_token") || "";
}

function request(path, options) {
  const opts = options || {};
  const authToken = opts.staff ? staffToken() : token();
  const timeout = opts.timeout || 20000;
  return new Promise((resolve, reject) => {
    wx.request({
      url: config.apiBaseUrl + path,
      method: opts.method || "GET",
      data: opts.data || undefined,
      timeout,
      header: Object.assign(
        {
          "content-type": "application/json"
        },
        authToken ? { Authorization: "Bearer " + authToken } : {},
        opts.header || {}
      ),
      success(res) {
        const data = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300 && data.ok !== false) {
          resolve(data);
          return;
        }
        reject(new Error(data.message || "请求失败"));
      },
      fail(err) {
        reject(new Error(err.errMsg || "网络连接失败"));
      }
    });
  });
}

function requestStaff(path, options) {
  return request(path, Object.assign({}, options || {}, { staff: true }));
}

function loginWithWeChat() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        request("/api/miniapp/auth/login", {
          method: "POST",
          data: {
            code: res.code,
            mockOpenId: config.devMockOpenId || undefined
          }
        })
          .then((data) => {
            if (data.token) app().setSession(data.token);
            resolve(data);
          })
          .catch(reject);
      },
      fail(err) {
        reject(new Error(err.errMsg || "微信登录失败"));
      }
    });
  });
}

function loginStaffWithWeChat() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        request("/api/miniapp/staff/auth/login", {
          method: "POST",
          data: {
            code: res.code,
            mockOpenId: config.devMockStaffOpenId || undefined
          }
        })
          .then((data) => {
            if (data.token) app().setStaffSession(data.token, data.staff);
            resolve(data);
          })
          .catch(reject);
      },
      fail(err) {
        reject(new Error(err.errMsg || "微信登录失败"));
      }
    });
  });
}

function bindStaffInvite(inviteToken) {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        request("/api/miniapp/staff/auth/bind-invite", {
          method: "POST",
          data: {
            code: res.code,
            token: inviteToken,
            mockOpenId: config.devMockStaffOpenId || undefined
          }
        })
          .then((data) => {
            if (data.token) app().setStaffSession(data.token, data.staff);
            resolve(data);
          })
          .catch(reject);
      },
      fail(err) {
        reject(new Error(err.errMsg || "微信登录失败"));
      }
    });
  });
}

function currentStudentId() {
  return app().globalData.currentStudentId || wx.getStorageSync("current_student_id") || "";
}

function requireStudentPage() {
  const id = currentStudentId();
  if (!id) {
    wx.switchTab({ url: "/pages/students/students" });
    return "";
  }
  return id;
}

function toast(message) {
  wx.showToast({ title: message || "操作失败", icon: "none" });
}

function downloadPdf(path) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: config.apiBaseUrl + path,
      header: token() ? { Authorization: "Bearer " + token() } : {},
      success(res) {
        if (res.statusCode !== 200) {
          reject(new Error("文件下载失败"));
          return;
        }
        wx.openDocument({
          filePath: res.tempFilePath,
          fileType: "pdf",
          showMenu: true,
          success: resolve,
          fail(err) {
            reject(new Error(err.errMsg || "无法打开文件"));
          }
        });
      },
      fail(err) {
        reject(new Error(err.errMsg || "文件下载失败"));
      }
    });
  });
}

function uploadFiles(path, filePaths, options) {
  const list = filePaths || [];
  const opts = options || {};
  const authToken = opts.staff ? staffToken() : token();
  let chain = Promise.resolve([]);
  list.forEach((filePath) => {
    chain = chain.then((acc) =>
      new Promise((resolve, reject) => {
        wx.uploadFile({
          url: config.apiBaseUrl + path,
          filePath,
          name: "files",
          header: authToken ? { Authorization: "Bearer " + authToken } : {},
          success(res) {
            let data = {};
            try {
              data = JSON.parse(res.data || "{}");
            } catch (err) {
              data = {};
            }
            if (res.statusCode >= 200 && res.statusCode < 300 && data.ok !== false) {
              resolve(acc.concat(data.urls || []));
              return;
            }
            reject(new Error(data.message || "附件上传失败"));
          },
          fail(err) {
            reject(new Error(err.errMsg || "附件上传失败"));
          }
        });
      })
    );
  });
  return chain;
}

module.exports = {
  request,
  requestStaff,
  loginWithWeChat,
  loginStaffWithWeChat,
  bindStaffInvite,
  currentStudentId,
  requireStudentPage,
  toast,
  downloadPdf,
  uploadFiles
};
