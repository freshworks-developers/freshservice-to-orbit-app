const base64 = require('base-64');
const axios = require('axios');

var OrbitBaseUrl = 'https://app.orbit.love';

exports = {
  sendTicketCreationInfo: async function (payload) {
    let {
      data: {
        ticket: { subject, description_text, requester_id, requester_name }
      },
      iparams
    } = payload;

    var serviceRequester = {
      subject,
      description_text,
      requester_id,
      requester_name
    };
    let encodedAPIKey = base64.encode(iparams.freshservice_apiKey);
    let OptsToFS = {
      headers: {
        Authorization: `Basic ${encodedAPIKey}`,
        'Content-Type': 'application/json'
      }
    };
    console.log('preparing to send request...');

    try {
      let { response: requesterDetails } = await $request.get(
        `https://${iparams.subdomain}.freshservice.com/api/v2/requesters/${serviceRequester.requester_id}`,
        OptsToFS
      );

      requesterDetails = JSON.parse(requesterDetails);
      var {
        requester: { first_name, primary_email }
      } = requesterDetails;
    } catch (error) {
      console.log('error', error);
    }
    console.log('request sent', first_name, primary_email, serviceRequester, iparams);

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
          name: first_name,
          source: 'Dev-Assist',
          email: primary_email
        },
        activity: {
          title: `${serviceRequester.subject}`,
          description: `${serviceRequester.description_text}`,
          activity_type: 'Ticket Is Created Via Assist Catalog',
          member: { email: primary_email }
        }
      }
    };
    try {
      let res = await axios.request(OptsToOrbit);
      console.log('response from orbit', res.status);
    } catch (error) {
      console.error('unable to send requests to orbit', error.status);
    }
  }
};
