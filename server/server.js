const base64 = require('base-64');
const axios = require('axios');

var onTicketCreatePayload, serviceRequester;
var iparams;

async function transformData(to, options) {
  switch (to) {
    case 'FS': {
      let {
        data: {
          ticket: { subject, description_text, requester_id, requester_name }
        }
      } = onTicketCreatePayload;

      serviceRequester = {
        subject,
        description_text,
        requester_id,
        requester_name
      };

      let encodedAPIKey = base64.encode(iparams.freshservice_apiKey);

      return {
        method: 'GET',
        baseURL: `https://${iparams.subdomain}.freshservice.com/api/v2`,
        url: `/requesters/${serviceRequester.requester_id}`,
        headers: {
          Authorization: `Basic ${encodedAPIKey}`,
          'Content-Type': 'application/json'
        }
      };
    }

    case 'Orbit': {
      return {
        method: 'POST',
        baseURL: 'https://app.orbit.love/api/v1',
        url: `/${iparams.workspace_slug}/activities`,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${iparams.orbit_apiKey}`,
          'Content-Type': 'application/json'
        },
        data: options
      };
    }
  }
}

exports = {
  sendTicketCreationInfo: async function (payload) {
    onTicketCreatePayload = payload;
    iparams = payload.iparams;
    let {
      data: {
        ticket: { id: ticket_id }
      }
    } = onTicketCreatePayload;
    let OptsToFS = await transformData('FS');

    try {
      let { data: requesterDetails } = await axios.request(OptsToFS);
      console.log('talking to FS complete', requesterDetails);
      var {
        requester: { first_name, primary_email }
      } = requesterDetails;
    } catch (error) {
      console.log('error', error);
    }
    let OptsToOrbit = await transformData('Orbit', {
      identity: {
        source: 'Dev-Assist',
        name: first_name
      },
      activity: {
        title: `${serviceRequester.subject}`,
        description: `${serviceRequester.description_text}`,
        activity_type: 'Ticket Is Created Via Assist Catalog',
        member: { email: primary_email },
        link: `https://${iparams.subdomain}.freshservice.com/helpdesk/tickets/${ticket_id}`
      }
    });

    try {
      let res = await axios.request(OptsToOrbit);
      console.info('talking to Orbit complete', res.status);
    } catch (error) {
      console.error('unable to send requests to orbit', error.status);
    }
  },

  sendConversationInfo: async function (payload) {
    let {
      data: {
        conversation: { body_text, from_email, ticket_id }
      }
    } = payload;
    iparams = payload.iparams;

    let OptsToOrbit = await transformData('Orbit', {
      identity: {
        source: 'Dev-Assist'
      },
      activity: {
        title: `Create Conversation in Freshservice`,
        description: `${body_text}`,
        activity_type: 'Reply Is Created in Assist Catalog',
        member: { email: from_email },
        link: `https://${iparams.subdomain}.freshservice.com/helpdesk/tickets/${ticket_id}`
      }
    });
    try {
      let res = await axios.request(OptsToOrbit);
      console.info('On conversation creation an activity is created in Orbit', res.status);
    } catch (error) {
      console.error('unable to send requests to orbit', error.message);
    }
  }
};
