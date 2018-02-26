require('dotenv').config();
const { log } = require('./config/bunyan');

const lodash = require('lodash');

const Agent = require('./myAgent');

const tenderAgent = new Agent({
  accountId: process.env.LP_ACCOUNT_ID,
  username: process.env.LP_USER_NAME,
  appKey: process.env.LP_AGENT_APP_KEY,
  secret: process.env.LP_AGENT_SECRET,
  accessToken: process.env.LP_AGENT_ACCESS_TOKEN,
  accessTokenSecret: process.env.LP_AGENT_ACCESS_TOKEN_SECRET,
});

tenderAgent.on('MyCoolAgent.ContentEvnet', (contentEvent) => {
  log.info('Content Event', contentEvent);
  if (lodash.isString(contentEvent.message) && contentEvent.message.startsWith('#close')) {
    tenderAgent.updateConversationField({
      conversationId: contentEvent.dialogId,
      conversationField: [{
        field: 'ConversationStateField',
        conversationState: 'CLOSE',
      }],
    });
  } else if (lodash.isString(contentEvent.message) && contentEvent.message.startsWith('#toMainBot')) {
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
        message: `echo tender sample1: ${contentEvent.message}`,
      },
    });
    // tenderAgent.publishEvent({
    //   dialogId: contentEvent.dialogId,
    //   event: {
    //     type: 'RichContentEvent',
    //     content: {
    //       type: 'vertical',
    //       elements: [
    //         {
    //           type: 'text',
    //           text: `echo routing_bot: ${contentEvent.message}`,
    //           tooltip: 'product name (Title)',
    //           style: {
    //             bold: true,
    //             size: 'large',
    //           },
    //         },
    //         {
    //           type: 'text',
    //           text: `echo routing_bot: ${contentEvent.message}`,
    //           tooltip: 'product name (Title)',
    //         },
    //        {
    //          type: 'image',
    //          url: 'https://i.imgur.com/ZOM7GQx.png',
    //          caption: 'This is an example of image caption',
    //          tooltip: 'image tooltip',
    //        },
    //       ],
    //     },
    //   },
    // }, null, [{
    //   type: 'ExternalId',
    //   id: 'CARD IDENTIFIER',
    // }], (err, res) => {
    //   if (err) log.error(err);
    //   log.info(res);
    // });
    tenderAgent.publishEvent({
      dialogId: contentEvent.dialogId,
      event: {
        type: 'RichContentEvent',
        content: {
          type: 'vertical',
          tag: 'list',
          externalPlatformVersion: '1.0',
          elements: [
            {
              type: 'vertical',
              elements: [
                {
                  type: 'text',
                  text: 'iPhones',
                  tooltip: 'text tooltip',
                  style: { bold: true, size: 'large' },
                },
                {
                  type: 'horizontal',
                  elements: [
                    {
                      type: 'vertical',
                      elements: [
                        {
                          type: 'text',
                          tag: 'title',
                          text: 'iPhone X',
                          tooltip: 'Title',
                          style: { bold: true, size: 'large' },
                        },
                        {
                          type: 'text',
                          tag: 'subtitle',
                          text: 'Black',
                          tooltip: 'Black',
                        },
                        {
                          type: 'button',
                          tooltip: 'Add to cart',
                          title: 'Add to cart',
                          click: {
                            actions: [
                              {
                                type: 'publishText',
                                text: 'iPhone X Added',
                              },
                            ],
                            metadata: [
                              {
                                type: 'ExternalId',
                                id: 'iPhone X',
                              },
                            ],
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'horizontal',
                  elements: [
                    {
                      type: 'vertical',
                      elements: [
                        {
                          type: 'text',
                          tag: 'title',
                          text: 'iPhone 8',
                          tooltip: 'iPhone 8',
                          style: { bold: true, size: 'large' },
                        },
                        {
                          type: 'text',
                          tag: 'subtitle',
                          text: 'Rose Gold',
                          tooltip: 'Rose Gold',
                        },
                        {
                          type: 'button',
                          tooltip: 'Add to cart',
                          title: 'Add to cart',
                          click: {
                            actions: [
                              {
                                type: 'publishText',
                                text: 'iPhone 8 Added',
                              },
                            ],
                            metadata: [
                              {
                                type: 'ExternalId',
                                id: 'iPhone 8',
                              },
                            ],
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: 'vertical',
              elements: [
                {
                  type: 'text',
                  text: 'iPads',
                  tooltip: 'iPads',
                  style: { bold: true, size: 'large' },
                },
                {
                  type: 'horizontal',
                  elements: [
                    {
                      type: 'vertical',
                      elements: [
                        {
                          type: 'text',
                          tag: 'title',
                          text: 'iPad Pro',
                          tooltip: 'iPad Pro',
                          style: { bold: true, size: 'large' },
                        },
                        {
                          type: 'text',
                          tag: 'subtitle',
                          text: 'Space Grey',
                          tooltip: 'Space Grey',
                        },
                        {
                          type: 'button',
                          tooltip: 'Add to cart',
                          title: 'Add to cart',
                          click: {
                            actions: [
                              {
                                type: 'publishText',
                                text: 'iPad Pro Added',
                              },
                            ],
                            metadata: [
                              {
                                type: 'ExternalId',
                                id: 'iPad Pro',
                              },
                            ],
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    }, null, [{
      type: 'BusinessChatMessage',
      multipleSelection: true,
      receivedMessage: {
        style: 'icon',
        subtitle: 'this is the subtitle',
        title: 'this is the title',
        secondarySubtitle: 'secondary subtitle',
        tertiarySubtitle: 'tertiarySubtitle',
      },
      replyMessage: {
        style: 'style',
        subtitle: 'subtitle',
        title: 'title',
        secondarySubtitle: 'secondarySubtitle',
        tertiarySubtitle: 'tertiarySubtitle',
      },
    }], (err, res) => {
      if (err) log.error(err);
      log.info(res);
    });
  }
});
