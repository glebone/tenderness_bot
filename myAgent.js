const { Agent } = require('node-agent-sdk');
const { log } = require('./config/bunyan');
const config = require('./config/config');
const dialogflow = require('./services/dialogflowService');
const agentService = require('./services/agentService');

class TenderAgent extends Agent {
  constructor(conf) {
    super(conf);
    this.conf = conf;
    this.init();
    this.contentEventNotificationName = 'MyCoolAgent.ContentEvent';
  }

  init() {
    const openConvs = {};

    this.on('connected', () => {
      log.info('connected...', this.conf.id || '');
      this.setAgentState({ availability: 'ONLINE' });
      this.subscribeExConversations({
        agentIds: [this.agentId],
        convState: ['OPEN'],
      }, () => log.info('subscribed successfully', this.conf.id || ''));
      this.subscribeRoutingTasks({});
      const ping = () => {
        this.getClock({}, (err) => {
          if (err) {
            log.error('Error on getClock!');
          }
        });
        this.pingTimeoutId = setTimeout(ping, config.LP.getClockInterval);
      };
      this.pingTimeoutId = setTimeout(ping, config.LP.getClockInterval);
    });

    this.on('routing.RoutingTaskNotification', (body) => {
      body.changes.forEach((c) => {
        if (c.type === 'UPSERT') {
          c.result.ringsDetails.forEach((r) => {
            if (r.ringState === 'WAITING') {
              this.updateRingState({
                ringId: r.ringId,
                ringState: 'ACCEPTED',
              }, async (e) => {
                if (e) log.error(e);
                const convId = r.ringId.split('_')[0];
                const message = await dialogflow.eventRequest('WELCOME', convId);
                if (
                  message.result &&
                  message.result.fulfillment &&
                  message.result.fulfillment.speech
                ) {
                  this.publishEvent({
                    dialogId: convId,
                    event: {
                      type: 'ContentEvent',
                      contentType: 'text/plain',
                      message: message.result.fulfillment.speech,
                    },
                  });
                }
                if (!openConvs[convId]) {
                  openConvs[convId] = {};
                  this.subscribeMessagingEvents({ fromSeq: 999999, dialogId: convId });
                }
              });
            }
          });
        }
      });
    });

    this.on('cqm.ExConversationChangeNotification', (notificationBody) => {
      notificationBody.changes.forEach(async (change) => {
        try {
          if (change.type === 'UPSERT' && !openConvs[change.result.convId]) {
            const { convId } = change.result;
            openConvs[convId] = {};
            let lastSeq = await agentService.lastSeq(this.transport.configuration, convId);
            if (!lastSeq) lastSeq = change.result.lastContentEventNotification.sequence;
            this.subscribeMessagingEvents({ fromSeq: lastSeq + 1, dialogId: convId });
          } else if (change.type === 'DELETE') {
            delete openConvs[change.result.convId];
          }
        } catch (err) {
          log.error(err);
        }
      });
    });

    // Echo every unread consumer message and mark it as read
    this.on('ms.MessagingEventNotification', (body) => {
      const respond = {};
      body.changes.forEach((c) => {
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

      Object.keys(respond).forEach((key) => {
        const contentEvent = respond[key];
        this.publishEvent({
          dialogId: contentEvent.dialogId,
          event: { type: 'AcceptStatusEvent', status: 'READ', sequenceList: [contentEvent.sequence] },
        });
        this.emit(this.contentEventNotificationName, contentEvent);
      });
    });

    this.on('error', err => log.info('got an error', err));
    this.on('closed', (data) => {
      clearTimeout(this.pingTimeoutId);
      log.info('socket closed', data);
      setTimeout(() => {
        this.reconnect(false);
      }, config.LP.reconnectDelay);
    });
  }
}

module.exports = TenderAgent;
