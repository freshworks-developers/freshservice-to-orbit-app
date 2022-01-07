const base64 = require('base-64');
const axios = require('axios');

var OrbitBaseUrl = 'https://app.orbit.love';
var onTicketCreatePayload, onConversationCreatePayload, serviceRequester;


async function talk(to, options) {
  let {
    data: {
      ticket: { subject, description_text, requester_id, requester_name }
    },
    iparams
  } = onTicketCreatePayload;

  switch (to) {
    case 'FS': {
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

    let OptsToFS = await talk('FS');

    try {
      let { data: requesterDetails } = await axios.request(OptsToFS);
      console.log('talking to FS complete', requesterDetails)
      var {
        requester: { first_name, primary_email }
      } = requesterDetails;
    } catch (error) {
      console.log('error', error);
    }
    let OptsToOrbit = await talk('Orbit', {
      identity: {
        source: 'Dev-Assist',
        name: first_name
      },
      activity: {
        title: `${serviceRequester.subject}`,
        description: `${serviceRequester.description_text}`,
        activity_type: 'Ticket Is Created Via Assist Catalog',
        member: { email: primary_email }
      }
    });

    try {
      let res = await axios.request(OptsToOrbit);
       console.log('talking to Orbit complete', res);
    } catch (error) {
      console.error('unable to send requests to orbit', error.status);
    }
  },
  sendConversationInfo: async function (payload) {
    onConversationCreatePayload = payload;

    let {
      data: {
        conversation: { body_text, from_email }
      },
      iparams
    } = payload;

    let OptsToOrbit = {
      method: 'POST',
      url: `${OrbitBaseUrl}/api/v1/${iparams.workspace_slug}/activities`,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${iparams.orbit_apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        identity: {
          source: 'Dev-Assist'
        },
        activity: {
          title: `Create Conversation in Freshservice`,
          description: `${body_text}`,
          activity_type: 'Reply Is Created in Assist Catalog',
          member: { email: from_email }
        }
      }
    };
    try {
      await axios.request(OptsToOrbit);
    } catch (error) {
      console.error('unable to send requests to orbit', error.message);
    }
  }
};
