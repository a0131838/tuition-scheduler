const api = require("../../utils/api");
Page({
  data:{loading:false,total:0,items:[],generatedAt:""},
  onShow(){this.load();},
  onPullDownRefresh(){this.load().finally(()=>wx.stopPullDownRefresh());},
  load(){this.setData({loading:true});return api.requestStaff("/api/miniapp/staff/health",{timeout:30000}).then((data)=>this.setData({total:data.total||0,items:(data.items||[]).map((item)=>Object.assign({},item,{tone:item.urgent&&item.count?"urgent":""})),generatedAt:data.generatedAt||""})).catch((err)=>api.toast(err.message)).finally(()=>this.setData({loading:false}));},
  open(e){const target=e.currentTarget.dataset.target;const map={operations:"/pages/staff-operations/staff-operations",requests:"/pages/staff-requests/staff-requests",communications:"/pages/staff-communications/staff-communications?kind=FEEDBACK", "communications-send":"/pages/staff-communications/staff-communications?kind=FEEDBACK&status=READY_TO_SEND",schedule:"/pages/staff-schedule/staff-schedule",approvals:"/pages/staff-approvals/staff-approvals",leads:"/pages/staff-leads/staff-leads",reminders:"/pages/staff-reminder-attention/staff-reminder-attention"};wx.navigateTo({url:map[target]||"/pages/staff-action-center/staff-action-center"});}
});
