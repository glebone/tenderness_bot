const { Agent } = require('node-agent-sdk');
const { log } = require('./config/bunyan');

class TenderAgent extends Agent {
  constructor(conf) {
    super(conf);
    this.conf = conf;
    this.init();
    this.CONTENT_NOTIFICATION = 'MyCoolAgent.ContentEvnet';
    this.initial = process.env.LP_INITIAL_SKILL_ID;
  }

  init() {
    const openConvs = {};

    this.on('connected', () => {
      log.info('connected...', this.conf.id || '');
      // console.log('Message: ', msg);
      this.setAgentState({ availability: 'ONLINE' });
      this.subscribeExConversations({
        agentIds: [this.agentId],
        convState: ['OPEN'],
      }, () => log.info('subscribed successfully', this.conf.id || ''));
      this.subscribeRoutingTasks({});
    });

    // Accept any routingTask (==ring)
    this.on('routing.RoutingTaskNotification', (body) => {
      // console.log('routing Task', JSON.stringify(body));
      body.changes.forEach((c) => {
        if (c.type === 'UPSERT') {
          c.result.ringsDetails.forEach((r) => {
            if (r.ringState === 'WAITING') {
              this.updateRingState({
                ringId: r.ringId,
                ringState: 'ACCEPTED',
              }, (e, resp) => log.info(resp));
            }
          });
        }
      });
    });

    // Notification on changes in the open consversation list
    this.on('cqm.ExConversationChangeNotification', (notificationBody) => {
      notificationBody.changes.forEach((change) => {
        if (change.type === 'UPSERT' && !openConvs[change.result.convId]) {
          // new conversation for me
          openConvs[change.result.convId] = {};

          // demonstraiton of using the consumer profile calls
          // const consumerId = change.result.conversationDetails.participants.filter(p => p.role === 'CONSUMER')[0].id;
          // this.getUserProfile(consumerId, (e, profileResp) => {
          //   this.publishEvent({
          //     dialogId: change.result.convId,
          //     event: {
          //       type: 'ContentEvent',
          //       contentType: 'text/plain',
          //       message: `Just joined to conversation with ${JSON.stringify(profileResp)}`,
          //     },
          //   });
          // });
          this.subscribeMessagingEvents({ dialogId: change.result.convId });
        } else if (change.type === 'DELETE') {
          // conversation was closed or transferred
          delete openConvs[change.result.convId];
        }
      });
    });

    // Echo every unread consumer message and mark it as read
    this.on('ms.MessagingEventNotification', (body) => {
      const respond = {};
      body.changes.forEach((c) => {
        // In the current version MessagingEventNotification are recived also without subscription
        // Will be fixed in the next api version. So we have to check if this notification is
        // handled by us.
        if (openConvs[c.dialogId]) {
          // add to respond list all content event not by me
          if (c.event.type === 'ContentEvent' && c.originatorId !== this.agentId) {
            respond[`${body.dialogId}-${c.sequence}`] = {
              dialogId: body.dialogId,
              sequence: c.sequence,
              message: c.event.message,
            };
          }
          // remove from respond list all the messages that were already read
          if (c.event.type === 'AcceptStatusEvent' && c.originatorId === this.agentId) {
            c.event.sequenceList.forEach((seq) => {
              delete respond[`${body.dialogId}-${seq}`];
            });
          }
        }
      });

      // publish read, and echo
      Object.keys(respond).forEach((key) => {
        const contentEvent = respond[key];
        this.publishEvent({
          dialogId: contentEvent.dialogId,
          event: { type: 'AcceptStatusEvent', status: 'READ', sequenceList: [contentEvent.sequence] },
        });
        this.emit(this.CONTENT_NOTIFICATION, contentEvent);
      });
    });

    // Tracing
    // this.on('notification', msg => log.info('got message', JSON.stringify(msg)));
    this.on('error', err => log.info('got an error', err));
    this.on('closed', data => log.info('socket closed', data));
  }
}

module.exports = TenderAgent;
