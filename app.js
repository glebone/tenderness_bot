require('dotenv').config();
const { log } = require('./config/bunyan');
const Agent = require('./myAgent');
const apiai = require('apiai');

const tenderAgent = new Agent({
  accountId: process.env.LP_ACCOUNT_ID,
  username: process.env.LP_USER_NAME,
  appKey: process.env.LP_AGENT_APP_KEY,
  secret: process.env.LP_AGENT_SECRET,
  accessToken: process.env.LP_AGENT_ACCESS_TOKEN,
  accessTokenSecret: process.env.LP_AGENT_ACCESS_TOKEN_SECRET,
});

async function dialogFlowRequest(text, messengerUserId) {
  return new Promise((resolve, reject) => {
    const apiaiApp = apiai(process.env.DIALOG_FLOW_TOKEN);
    const request = apiaiApp.textRequest(text, {
      sessionId: messengerUserId
    });
    request.on('response', (response) => {
      resolve(response);
    });
    request.on('error', (error) => {
      console.log(error);
      reject(error);
    });
    request.end();
  });
}

tenderAgent.on('MyCoolAgent.ContentEvnet', async (contentEvent) => {
  log.info('Content Event', contentEvent);
  const DFResponse = await dialogFlowRequest(
    contentEvent.message,
    contentEvent.dialogId
  );
  if (contentEvent.message.startsWith('#close')) {
    tenderAgent.updateConversationField({
      conversationId: contentEvent.dialogId,
      conversationField: [{
        field: 'ConversationStateField',
        conversationState: 'CLOSE',
      }],
    });
  } else if (DFResponse.result.action == '#changeToMainBot') {
    log.info('Return to Main Bot');
    tenderAgent.updateConversationField({
      conversationId: contentEvent.dialogId,
      conversationField: [
        {
          field: 'ParticipantsChange',
          type: 'REMOVE',
          role: 'ASSIGNED_AGENT',
        },
        {
          field: 'Skill',
          type: 'UPDATE',
          skill: process.env.MAIN_BOT_ID,
        },
      ],
    });
  } else {
    tenderAgent.publishEvent({
      dialogId: contentEvent.dialogId,
      event: {
        type: 'ContentEvent',
        contentType: 'text/plain',
        message: `echo tender sample: ${DFResponse.result.fulfillment.speech}`,
      },
    });
  }
});
