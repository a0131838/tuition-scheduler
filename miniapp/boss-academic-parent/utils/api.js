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

function summarizeForLog(value, depth) {
  const level = depth || 0;
  if (level > 4) return "[truncated]";
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value.slice(0, 1200);
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => summarizeForLog(item, level + 1));
  if (value && typeof value === "object") {
    const blocked = { authorization: 1, code: 1, mockopenid: 1, password: 1, previewtoken: 1, signaturedataurl: 1, token: 1 };
    const out = {};
    Object.keys(value).slice(0, 40).forEach((key) => {
      out[key] = blocked[key.toLowerCase()] ? "[redacted]" : summarizeForLog(value[key], level + 1);
    });
    return out;
  }
  return String(value || "").slice(0, 1200);
}

function logOperation(path, method, opts, result) {
  if (!path || path === "/api/miniapp/operation-log" || method === "GET") return;
  const authToken = opts.staff ? staffToken() : token();
  if (!authToken) return;
  const recent = wx.getStorageSync("miniapp_recent_operations");
  const recentRows = Array.isArray(recent) ? recent : [];
  recentRows.unshift({ path, method, outcome: result.ok ? "SUCCESS" : "FAILED", statusCode: result.statusCode || 0, error: String(result.error || "").slice(0, 300), clientAt: new Date().toISOString() });
  wx.setStorageSync("miniapp_recent_operations", recentRows.slice(0, 10));
  wx.request({
    url: config.apiBaseUrl + "/api/miniapp/operation-log",
    method: "POST",
    timeout: 8000,
    header: { "content-type": "application/json", Authorization: "Bearer " + authToken },
    data: {
      path,
      method,
      outcome: result.ok ? "SUCCESS" : "FAILED",
      statusCode: result.statusCode || 0,
      requestData: summarizeForLog(opts.data || null),
      responseData: summarizeForLog(result.data || null),
      error: result.error || "",
      clientAt: new Date().toISOString()
    },
    success() {},
    fail() {}
  });
}

function recentOperations() {
  const rows = wx.getStorageSync("miniapp_recent_operations");
  return Array.isArray(rows) ? rows : [];
}

function request(path, options) {
  const opts = options || {};
  const authToken = opts.staff ? staffToken() : token();
  const timeout = opts.timeout || 20000;
  const method = String(opts.method || "GET").toUpperCase();
  return new Promise((resolve, reject) => {
    wx.request({
      url: config.apiBaseUrl + path,
      method,
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
          logOperation(path, method, opts, { ok: true, statusCode: res.statusCode, data });
          resolve(data);
          return;
        }
        logOperation(path, method, opts, { ok: false, statusCode: res.statusCode, data, error: data.message || "请求失败" });
        reject(new Error(data.message || "请求失败"));
      },
      fail(err) {
        logOperation(path, method, opts, { ok: false, statusCode: 0, error: err.errMsg || "网络连接失败" });
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

function loginStaffWithWeChat(userId) {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        request("/api/miniapp/staff/auth/login", {
          method: "POST",
          data: {
            code: res.code,
            mockOpenId: config.devMockStaffOpenId || undefined,
            userId: userId || undefined
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
  return chain.then((urls) => {
    logOperation(path, "UPLOAD", opts, { ok: true, statusCode: 200, data: { fileCount: list.length, uploadedCount: urls.length } });
    return urls;
  }).catch((err) => {
    logOperation(path, "UPLOAD", opts, { ok: false, statusCode: 0, error: err.message || "附件上传失败", data: { fileCount: list.length } });
    throw err;
  });
}

function uploadStaffForm(path, filePath, name, formData) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: config.apiBaseUrl + path,
      filePath,
      name: name || "file",
      formData: formData || {},
      header: staffToken() ? { Authorization: "Bearer " + staffToken() } : {},
      success(res) {
        let data = {};
        try {
          data = JSON.parse(res.data || "{}");
        } catch (err) {
          data = {};
        }
        if (res.statusCode >= 200 && res.statusCode < 300 && data.ok !== false) {
          logOperation(path, "UPLOAD", { staff: true, data: formData || {} }, { ok: true, statusCode: res.statusCode, data });
          resolve(data);
          return;
        }
        logOperation(path, "UPLOAD", { staff: true, data: formData || {} }, { ok: false, statusCode: res.statusCode, data, error: data.message || "文件提交失败" });
        reject(new Error(data.message || "文件提交失败"));
      },
      fail(err) {
        logOperation(path, "UPLOAD", { staff: true, data: formData || {} }, { ok: false, statusCode: 0, error: err.errMsg || "文件提交失败" });
        reject(new Error(err.errMsg || "文件提交失败"));
      }
    });
  });
}

function saveStaffImage(path) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: config.apiBaseUrl + path,
      header: staffToken() ? { Authorization: "Bearer " + staffToken() } : {},
      success(res) {
        if (res.statusCode !== 200) return reject(new Error("图片生成失败"));
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: resolve,
          fail(err) { reject(new Error(err.errMsg || "无法保存到相册")); }
        });
      },
      fail(err) { reject(new Error(err.errMsg || "图片下载失败")); }
    });
  });
}

function downloadStaffFile(path) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: config.apiBaseUrl + path,
      header: staffToken() ? { Authorization: "Bearer " + staffToken() } : {},
      success(res) {
        if (res.statusCode !== 200) return reject(new Error("附件读取失败"));
        resolve(res.tempFilePath);
      },
      fail(err) { reject(new Error(err.errMsg || "附件下载失败")); }
    });
  });
}

function openStaffDocument(path, name) {
  return downloadStaffFile(path).then((filePath) => new Promise((resolve, reject) => {
    const extension = String(name || "").split(".").pop().toLowerCase();
    wx.openDocument({
      filePath,
      fileType: extension || undefined,
      showMenu: true,
      success: resolve,
      fail(err) { reject(new Error(err.errMsg || "无法打开附件")); }
    });
  }));
}

function openParentDocument(path, name) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: config.apiBaseUrl + path,
      header: token() ? { Authorization: "Bearer " + token() } : {},
      success(res) {
        if (res.statusCode !== 200) return reject(new Error("附件读取失败"));
        const extension = String(name || "").split(".").pop().toLowerCase();
        wx.openDocument({ filePath: res.tempFilePath, fileType: extension || undefined, showMenu: true, success: resolve, fail(err) { reject(new Error(err.errMsg || "无法打开附件")); } });
      },
      fail(err) { reject(new Error(err.errMsg || "附件下载失败")); }
    });
  });
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
  uploadFiles,
  uploadStaffForm,
  saveStaffImage,
  downloadStaffFile,
  openStaffDocument,
  openParentDocument,
  recentOperations
};
