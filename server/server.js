const base64 = require('base-64');
const axios = require('axios');

var iparams, fsAPI, orbitAPI;

async function transformData(to, options) {
  switch (to) {
    case 'FS': {
      return;
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

    fsAPI = axios.create({
      baseURL: `https://${iparams.subdomain}.freshservice.com/api/v2`,
      headers: {
        Authorization: `Basic ${encodedAPIKey}`,
        'Content-Type': 'application/json'
      }
    });

    OrbitAPI = axios.create({
      method: 'POST',
      baseURL: 'https://app.orbit.love/api/v1',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${iparams.orbit_apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    try {
      let { data: requesterDetails } = await fsAPI.get(`/requesters/${serviceRequester.requester_id}`);
      let { data: requestedItemInformation } = await fsAPI.get(`/tickets/${ticket_id}/requested_items`);
      var {
        requester: { first_name, primary_email }
      } = requesterDetails;
      var { requested_items } = requestedItemInformation;
      var item_details = requested_items[0].custom_fields;

      let res = await OrbitAPI.post(`/${iparams.workspace_slug}/activities`, {
        identity: {
          source: 'freshservice'
        },
        activity: {
          title: `${serviceRequester.subject}`,
          description: `${serviceRequester.description_text}\n${JSON.stringify(item_details, null, 2)}`,
          activity_type: 'Ticket Is Created Via Assist Catalog',
          member: { email: primary_email, name: first_name },
          link: `https://${iparams.subdomain}.freshservice.com/helpdesk/tickets/${ticket_id}`
        }
      });
      console.info('talking to Orbit complete', res.data);
    } catch (error) {
      console.error('unable to send requests to orbit', error);
    }
  },

  sendConversationInfo: async function (payload) {
    let {
      data: {
        conversation: { body_text, user_id, ticket_id }
      }
    } = payload;
    console.info('conversation payload', user_id);
    iparams = payload.iparams;
    let encodedAPIKey = base64.encode(iparams.freshservice_apiKey); // requester id = 14001358196
    try {
      var {
        data: {
          requester: { first_name, last_name, primary_email, secondary_emails }
        }
      } = await axios.request({
        method: 'GET',
        baseURL: `https://${iparams.subdomain}.freshservice.com/api/v2`,
        url: `/requesters/${user_id}`,
        headers: {
          Authorization: `Basic ${encodedAPIKey}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('replier-email', first_name, last_name, primary_email, secondary_emails);
    } catch (error) {
      console.error('problem getting user details', error);
    }

    let OptsToOrbit = await transformData('Orbit', {
      identity: {
        source: 'freshservice',
        uid: `${user_id}`
      },
      activity: {
        title: `Create Conversation in Freshservice`,
        description: `${body_text}`,
        activity_type: 'Reply Is Created in Assist Catalog',
        member: { email: primary_email, name: `${first_name} ${last_name}` },
        link: `https://${iparams.subdomain}.freshservice.com/helpdesk/tickets/${ticket_id}`
      }
    });
    console.log('onConvCreate - OptsToOrbit', JSON.stringify(OptsToOrbit));
    try {
      let res = await axios.request(OptsToOrbit);
      console.info('On conversation creation an activity is created in Orbit', res.data);
    } catch (error) {
      console.error('unable to send requests to orbit', JSON.stringify(error));
    }
  }
};
