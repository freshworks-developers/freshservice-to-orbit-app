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
      console.log('OnTickCreate - serviceRequester', serviceRequester);
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
    let OptsToGetServiceReqDetails = await transformData('FS');
    console.log('OnTickCreate - OptsToGetServiceReqDetails', OptsToGetServiceReqDetails);
    try {
      let { data: requesterDetails } = await axios.request(OptsToGetServiceReqDetails);
      let OptsToGetCustomFieldDetails = OptsToGetServiceReqDetails;

      OptsToGetCustomFieldDetails.url = `/tickets/${ticket_id}/requested_items`;

      let { data: requestedItemInformation } = await axios.request(OptsToGetCustomFieldDetails);

      var {
        requester: { first_name, primary_email }
      } = requesterDetails;

      var { requested_items } = requestedItemInformation;
      // console.log('requested item info', requestedItemInformation);
      var item_details = requested_items[0].custom_fields;
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
        description: `${serviceRequester.description_text}\n${JSON.stringify(item_details)}`,
        activity_type: 'Ticket Is Created Via Assist Catalog',
        member: { email: primary_email },
        link: `https://${iparams.subdomain}.freshservice.com/helpdesk/tickets/${ticket_id}`
      }
    });
    // console.log('OptsToOrbit', OptsToOrbit);

    try {
      console.log('[onTicketCreate] Options being passed to Orbit', OptsToOrbit.data.activity);
      let res = await axios.request(OptsToOrbit);
      console.info('talking to Orbit complete', res.data);
    } catch (error) {
      console.error('unable to send requests to orbit', error.status);
    }
  },

  sendConversationInfo: async function (payload) {
    let {
      data: {
        conversation: { body_text, from_email, ticket_id },
        private,
        user_id
      }
    } = payload;
    console.info('conversation payload', JSON.stringify(payload));
    iparams = payload.iparams;
    let encodedAPIKey = base64.encode(iparams.freshservice_apiKey); // requester id = 14001358196
    if (private) {
      let { data: replier_email } = await axios.request({
        method: 'GET',
        baseURL: `https://${iparams.subdomain}.freshservice.com/api/v2`,
        url: `/agents/${user_id}`,
        headers: {
          Authorization: `Basic ${encodedAPIKey}`,
          'Content-Type': 'application/json'
        }
      });
    } else {
      let { data: replier_email } = await axios.request({
        method: 'GET',
        baseURL: `https://${iparams.subdomain}.freshservice.com/api/v2`,
        url: `/requesters/${user_id}`,
        headers: {
          Authorization: `Basic ${encodedAPIKey}`,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('replier-email', replier_email);

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
    console.log('onConvCreate - OptsToOrbit', JSON.stringify(OptsToOrbit));
    try {
      let res = await axios.request(OptsToOrbit);
      console.info('On conversation creation an activity is created in Orbit', res.status);
    } catch (error) {
      console.error('unable to send requests to orbit', JSON.stringify(error));
    }
  }
};
