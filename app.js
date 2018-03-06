require('dotenv').config();
const { log } = require('./config/bunyan');
const Agent = require('./myAgent');
const config = require('./config/config');
const lodash = require('lodash');
const dialogflow = require('./services/dialogflowService');


const tenderAgent = new Agent({
  accountId: config.LP.accountId,
  username: config.LP.username,
  appKey: config.LP.appKey,
  secret: config.LP.secret,
  accessToken: config.LP.accessToken,
  accessTokenSecret: config.LP.accessTokenSecret,
});


tenderAgent.on('MyCoolAgent.ContentEvnet', async (contentEvent) => {
  log.info('Content Event', contentEvent);
  try {
    const DFResponse = await dialogflow.textRequest(
      contentEvent.message,
      contentEvent.dialogId,
    );
    if (lodash.isString(contentEvent.message) && contentEvent.message.startsWith('#close')) {
      tenderAgent.updateConversationField({
        conversationId: contentEvent.dialogId,
        conversationField: [{
          field: 'ConversationStateField',
          conversationState: 'CLOSE',
        }],
      });
    } else if (contentEvent.message.startsWith(config.DIALOG_FLOW.eventPrefix)) {
      const eventStr = contentEvent.message
        .substring(config.DIALOG_FLOW.eventPrefix.length, contentEvent.message.length);
      const event = await dialogflow.eventRequest(eventStr, contentEvent.dialogId);
      tenderAgent.publishEvent({
        dialogId: contentEvent.dialogId,
        event: {
          type: 'ContentEvent',
          contentType: 'text/plain',
          message: `${event.result.fulfillment.speech}`,
        },
      });
    } else if (contentEvent.message.startsWith(config.DIALOG_FLOW.skillPrefix)) {
      const skillStr = contentEvent.message
        .substring(config.DIALOG_FLOW.skillPrefix.length, contentEvent.message.length);
      if (Number.isInteger(Number.parseInt(skillStr, 10))) {
        const skill = await dialogflow.eventRequest(skillStr, contentEvent.dialogId);
        tenderAgent.publishEvent({
          dialogId: contentEvent.dialogId,
          event: {
            type: 'ContentEvent',
            contentType: 'text/plain',
            message: `${skill.result.fulfillment.speech}`,
          },
        });
      } else {
        log.error(`skill: "${skillStr}" isn't number`);
      }
    } else if (DFResponse.result.action === '#changeToMainBot') {
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
            skill: config.LP.mainBotId,
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
  } catch (err) {
    log.error(err);
  }
});
