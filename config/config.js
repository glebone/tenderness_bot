const config = {};

config.ENV = process.env.ENV;

config.LP = {
  accountId: process.env.LP_ACCOUNT_ID,
  username: process.env.LP_USER_NAME,
  appKey: process.env.LP_AGENT_APP_KEY,
  secret: process.env.LP_AGENT_SECRET,
  accessToken: process.env.LP_AGENT_ACCESS_TOKEN,
  accessTokenSecret: process.env.LP_AGENT_ACCESS_TOKEN_SECRET,
  mainBotSkillId: process.env.LP_MAIN_BOT_SKILL_ID,
  getClockInterval: 30000,
  reconnectDelay: 3000,
};

config.DIALOG_FLOW = {
  token: process.env.DIALOG_FLOW_TOKEN,
  eventPrefix: '#event ',
  skillPrefix: '#skill ',
  backToMainBotAction: process.env.DIALOG_FLOW_BACK_TO_MAIN_BOT_ACTION || '#changeToMainBot',
};

module.exports = config;
